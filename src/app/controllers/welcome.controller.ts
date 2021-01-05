import { Request, Response, NextFunction } from "express";
import { Controller, Get, Post, RequiredParams, ConvertToLowercase } from "../helpers/decorators";

@Controller("/")
export class WelcomeController {

    @Get()
    private _welcome(req: Request, resp: Response, next: NextFunction) {
        resp.send(" Welcome to velapro signaling server")
    }
}