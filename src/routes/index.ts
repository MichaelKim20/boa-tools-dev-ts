import * as express from "express";
import {Page, Distributor} from "../modules";

export const register = (app: express.Application) => {
    // home page
    app.get("/", (req: any, res) => {
        const page = new Page(0, "Developers page");
        res.render('index',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });

    app.get("/distribute", (req: any, res) => {
        const distributor = new Distributor();
        distributor.send()
            .then((result) => {
                const page = new Page(1, "Result of distribution");
                res.render('distribute',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });

    app.get("/PF1000", (req: any, res) => {
        const page = new Page(1, "Distribute Genesis Coins");
        res.render('pf1000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });

    app.get("/PG1000", (req: any, res) => {
        const page = new Page(2, "Proposal Fee Transfer");
        res.render('pg1000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });

    app.get("/PG2000", (req: any, res) => {
        const page = new Page(2, "Voting Fee Transfer");
        res.render('pg2000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });

    app.get("/PG3000", (req: any, res) => {
        const page = new Page(2, "Voting");
        res.render('pg3000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });
};
