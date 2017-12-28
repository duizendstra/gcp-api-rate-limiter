function gcpApiRateLimiter(specs) {
    "use strict";
    // the main throttle function
    let throttle;

    // the function that executes the task
    let task;

    // the permitted actions per millisecond
    let tasksPerMillisecond;

    // the placeholder for a active task
    let currentActiveTask;

    // the time when the last task was executed
    let lastTaskExecutionTime = 0;

    // the main queue for the pending tasks
    let queue = [];

    // the delay promise factory
    const delay = function (milliSeconds) {
        // set the promise to resolve after a timout in miliSeconds
        return new Promise(function (resolve) {
            setTimeout(resolve, milliSeconds);
        });
    };

    // the defer promise factory
    const defer = function () {
        let deferred = {};
        // make the resolve and reject functions available
        deferred.promise = new Promise(function (resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    };

    // them main throttle function
    throttle = function () {
        // create the defer promise
        let deferred = defer();

        // add the defer promise to the queue
        queue.push(deferred);

        // returns the deferred promise when it can be executed
        return task().then(function () {
            return deferred.promise;
        });
    };

    task = function () {
        if (currentActiveTask !== undefined || queue.length === 0) {
            return currentActiveTask;
        }

        // calculate the wait time
        let milliSecondsToWait = tasksPerMillisecond - (Date.now() - lastTaskExecutionTime);

        // create a promise that waits or resolves immediately
        let promise = function () {
            if (milliSecondsToWait > 0) {
                return delay(milliSecondsToWait);
            }
            return Promise.resolve();
        };

        // set the active task promise
        currentActiveTask = promise().then(function () {
            let now = Date.now();

            // execute the task if permitted
            if (now - lastTaskExecutionTime >= tasksPerMillisecond) {
                lastTaskExecutionTime = now;
                queue.shift().resolve();
            }

            // clear the current task and recurse
            currentActiveTask = undefined;
            task();
        });

        return currentActiveTask;
    };

    // resolve all promises
    let resolveAll = function (s) {
        queue.forEach(function (deferred) {
            return deferred.resolve(s);
        });

        queue = [];
    };

    // reject all promises
    let rejectAll = function (err) {
        queue.forEach(function (deferred) {
            return deferred.reject(err);
        });

        queue = [];
    };

    // Task the functin specifications
    if (typeof specs.tasksPerMillisecond !== "number") {
        throw new TypeError("Please provide a number");
    }

    tasksPerMillisecond = specs.tasksPerMillisecond;

    if (tasksPerMillisecond < 0) {
        tasksPerMillisecond = 0;
    }

    return {
        throttle: throttle,
        resolveAll: resolveAll,
        rejectAll: rejectAll
    };
}

module.exports = gcpApiRateLimiter;