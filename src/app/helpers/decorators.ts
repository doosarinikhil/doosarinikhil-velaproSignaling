import { Router, Application, Response } from "express";

function getMetaData(target: any) {
    if (!target.__routeInfo) {
        target.__routeInfo = {
            url: "",
            router: Router()
        }
    }
    return target.__routeInfo;
}

function decoratorHelper(method: string, url: string) {
    return (target: any, key: string | Symbol, descriptor: PropertyDescriptor) => {
        let routeInfo = getMetaData(target);
        routeInfo["router"][method](url, descriptor.value);
    }
}

export function Controller(path: string) {
    return function (constructor: Function) {
        constructor.prototype.__routeInfo['url'] = path;
        constructor.prototype._path = path;
        constructor.prototype.router = () => {
            return constructor.prototype.__routeInfo['router'];
        }
    }
}

export function attachRoutes(app: Application, controllers: any[]) {
    controllers.forEach((controller: any) => {
        app.use(controller._path, controller['router']());
    });
}

export function Get(routePath: string = "/") {
    return decoratorHelper("get", `${routePath}`);
}

export function Post(routePath: string = "/") {
    return decoratorHelper("post", `${routePath}`);
}

export function Put(routePath: string = "/") {
    return decoratorHelper("put", `${routePath}`);
}

export function Delete(routePath: string = "/") {
    return decoratorHelper("delete", `${routePath}`);
}

export function Patch(routePath: string = "/") {
    return decoratorHelper("patch", `${routePath}`);
}

export function ConvertToLowercase(params: Array<string>) {
    return function (target: Object, key: string | Symbol, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = function (...args: any[]) {
            let reqBody = args[0].body;
            let response: Response = args[1];
            let reqParams: Array<string> = Object.keys(reqBody);

            params.forEach((param) => {
                if (reqParams.includes(param)) {
                    reqBody[param] = reqBody[param].toLowerCase().trim();
                }
            });

            return original.apply(this, args);
        }
    }
}

export function RequiredParams(params: Array<string | any>) {
    return function (target: Object, key: string | Symbol, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = function (...args: any[]) {
            let reqBody = args[0].body;
            let errMsg: Array<Object> = [];
            let errFlag = 0;
            let result: any;
            let response: Response = args[1];
            if (reqBody) {
                let reqParams: Array<string> = Object.keys(reqBody);
                params.forEach((param) => {
                    if (!reqParams.includes(param) || reqBody[param] === null || reqBody[param] === undefined) {
                        errFlag = 1;
                        errMsg.push({ key: param, message: `${param} is required` });
                    }
                });

                if (!!errFlag) {
                    result = response.json({ status: false, message: errMsg });
                } else {
                    result = original.apply(this, args);
                }
            } else {
                params.forEach((param) => {
                    errMsg.push({ key: param, message: `${param} is required` });
                });
                result = response.json({ status: false, message: errMsg });
            }
            return result;
        }
    }
}
