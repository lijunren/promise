const PENDING = "pending";
const FULFILLED = "fullfulled";
const REJECTED = "rejected";
/**
    promise构造函数 
* @executor 需传入executor执行器，这个执行器是个可执行函数
*/
function Promise(executor) { 
    const self = this;
    self.status = PENDING; // 初始状态
    self.onFulfilled = []; // 成功的回调
    self.onRejected = []; // 失败的回调
    function resolve(value) {
        setTimeout(() => {
            if(self.status === PENDING) {
                self.status = FULFILLED;
                self.value = value;
                self.onFulfilled.forEach(fn => fn()); // 发布resolve消息
            }
        });
    }
    function reject(reason) {
        setTimeout(() => {
            if(self.status === PENDING) {
                self.status = REJECTED;
                self.reason = reason;
                self.onRejected.forEach(fn => fn()); // 发布reject消息
            }
        });
    }
    try{
        executor(resolve,reject);
    } catch(e) {
        reject(e); 
    }
}
Promise.prototype.then = function(onFulfilled, onRejected) { 
    // 原型上添加then方法， 传入两个参数，参数为函数。 成功的回调 onFulfilled, 和 promise 失败的回调 onRejected
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : value => value;
    onRejected = typeof onRejected === "function" ? onRejected : reason => {throw reason};
    const self = this;
    // console.log(">>>>>>>>>>", self.status, self.value);
    const promise2 = new Promise((resolve, reject) => {  // new 一个新的promise实例
        if (self.status === FULFILLED) { // 成功状态
            try{
                setTimeout(() => {
                    const x = onFulfilled(self.value);
                    resolvePromise(promise2, x, resolve, reject);
                })
            } catch (e) {
                reject(e);
            }
        } else if (self.status === REJECTED) { //失败状态
            try{
                setTimeout(() => {
                    const x = onRejected(self.reason);
                    resolvePromise(promise2, x, resolve, reject);
                })
            } catch (e) {
                reject(e);
            }

        } else if (self.status === PENDING){ // 等待状态
            self.onFulfilled.push((value) => { // 添加resolve订阅（放到new出来的实例上）
                try{
                    const x = onFulfilled(value);
                    resolvePromise(promise2, x, resolve, reject);
                } catch(e) {
                    reject(e);
                }
            });
            self.onRejected.push((reason) => { // 添加reject订阅（放到new出来的实例上）
                try{
                    const x = onRejected(reason);
                    resolvePromise(promise2, x, resolve, reject);
                } catch(e) {
                    reject(e);
                }
            });
        }
    });
    return promise2;
}
/**
 * resolve中的值几种情况：
 * 1.普通值
 * 2.promise对象
 * 3.thenable对象/函数
 */

/**
 * 对resolve 进行改造增强 针对resolve中不同值情况进行处理
 * @param  {promise} promise2 promise1.then方法返回的新的promise对象
 * @param  {[type]} x         promise1中onFulfilled的返回值
 * @param  {[type]} resolve   promise2的resolve方法
 * @param  {[type]} reject    promise2的reject方法
 */
function resolvePromise(newPromise, x, resolve, reject){
    if (newPromise === x) {
        return reject(new Error("循环引用"));
    }
    let called = false; // 避免多次调用
    if (x instanceof Promise) {
        // x为promise对象
        if (x.status === PENDING) {
            // 循环调用resolvePromise，直到staus状态不为penging
            x.then(y => {
                resolvePromise(newPromise, y, resolve, reject);
            }, reason => {
                reject(reason);
            });
        } else {
            // 如果 x 已经处于执行态/拒绝态(值已经被解析为普通值)，用相同的值执行传递下去 promise
            // x.then(y => resolve(y), reason => reject(reason));
            x.then(resolve, reject);
        }
    } else if (x !== null && (typeof x === "function" || typeof x === "object")) {
        // 是否是thenable对象（具有then方法的对象/函数）
        try{
            const then = x.then;
            if (typeof then === "function") {
                if(called) return;
                called = true;
                then.call(x, y=>{
                    resolvePromise(newPromise, y, resolve, reject);
                }, reason => {
                    reject(reason);
                })
            } else {
                resolve(x);
            }
        } catch(e) {
            if(called) return;
            called = true;
            reject(e);
        }
    } else {
        // 普通值
        resolve(x);
    }
}
Promise.prototype.catch = function(onRejected) {
    // onRejected = typeof onRejected === "function" ? onRejected : reason => {reason};
    // const self = this;
    // const promise3 = new Promise((resolve, reject) => {
    //     if (self.status === REJECTED) {
    //         setTimeout(() => {
    //             const x = onRejected(self.value);
    //         });
    //     } else if (self.status === PENDING) {
    //         self.onRejected.push(setTimeout((reason) => {
    //             const x = onRejected(reason);
    //         }));
    //     }
    // });
    // return promise3;
    return this.then(null, onRejected);
}
/**
 * Promise.all Promise进行并行处理
 * 参数: promise对象组成的数组作为参数
 * 返回值: 返回一个Promise实例
 * 当这个数组里的所有promise对象全部变为resolve状态的时候，才会resolve。
 */
Promise.all = function(promises){
    return new Promise((resolve, reject) => {
        const gen = [];
        const len = promises.length;
        if (len === 0) {
            resolve(gen);
            return;
        }
        promises.forEach((promise, index) => {
            promise.then(value => {
                gen[index] = value;
                if (len === index + 1) {
                    resolve(gen);
                }
            }, reject);
        });
    });
};
/**
 * Promise.race
 * 参数: 接收 promise对象组成的数组作为参数
 * 返回值: 返回一个Promise实例
 * 只要有一个promise对象进入 FulFilled 或者 Rejected 状态的话，就会继续进行后面的处理(取决于哪一个更快)
 */
Promise.race = function(promises) {
    return new Promise((resolve, reject) => {
        promises.forEach((promise, index) => {
            // promise.then(value => {
            //     resolve(value);
            // }, reason => {
            //     reject(reason);
            // });
            promise.then(resolve, reject);
        });
    });
}

Promise.resolve = function(value) {
    return new Promise((resolve, reject) => {
        resolve(value);
    })
}
Promise.reject = function(reason) {
    return new Promise((resolve, reject) => {
        reject(reason);
    })
}

/**
 * 基于Promise实现Deferred的
 * Deferred和Promise的关系
 * - Deferred 拥有 Promise
 * - Deferred 具备对 Promise的状态进行操作的特权方法（resolve reject）
 *
 *参考jQuery.Deferred
 *url: http://api.jquery.com/category/deferred-object/
 */
Promise.deferred = function() { // 延迟对象
    let defer = {};
    defer.promise = new Promise((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
    });
    return defer;
}

try {
    module.exports = Promise
  } catch (e) {
}