import * as express from "express";
import {
    Page, Distributor, RandomTxSender, RandomTxSender2In, LargeTxSender, Unfreezing, TxCanceller, InfoProvider,
    ProposalFeeSender, IProposalFeeLinkData,
    VotingFeeSender, IVotingFeeLinkData,
    VoteSender, IVoteLinkData
} from "../modules";

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

    app.get("/PF1000", (req: any, res) => {
        const page = new Page(1, "Distribute Genesis Coins");
        res.render('pf1000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });

    app.get("/PF1200", (req: any, res) => {
        const distributor = new Distributor();
        distributor.send()
            .then((result) => {
                const page = new Page(1, "Result of distribution");
                res.render('pf1200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });

    app.get("/PF2000", (req: any, res) => {
        const page = new Page(1, "Send Random Transaction");
        res.render('pf2000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });


    app.get("/PF2200", (req: any, res) => {
        const sender = new RandomTxSender();
        sender.send()
            .then((result) => {
                const page = new Page(1, "Result of send transaction");
                res.render('pf2200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });

    app.get("/PF3000", (req: any, res) => {
        const provider = new InfoProvider();
        provider.getInformation()
            .then((result) => {
                const page = new Page(1, "Information");
                res.render('pf3000',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });

    app.get("/PF4000", (req: any, res) => {
        const page = new Page(1, "Send Large Transaction");
        res.render('pf4000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });


    app.get("/PF4200", (req: any, res) => {
        const sender = new LargeTxSender();
        sender.send()
            .then((result) => {
                const page = new Page(1, "Result of send transaction");
                res.render('pf4200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });


    app.get("/PF5000", (req: any, res) => {
        const page = new Page(1, "Send Unfrozen Transaction");
        res.render('pf5000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });


    app.get("/PF5200", (req: any, res) => {
        const sender = new Unfreezing();
        sender.send()
            .then((result) => {
                const page = new Page(1, "Result of send transaction");
                res.render('pf5200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });

    app.get("/PF6000", (req: any, res) => {
        const page = new Page(1, "Send Cancel Transaction");
        res.render('pf6000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });

    app.post("/PF6200", (req: any, res) => {
        let tx_hash: string = req.body.tx_hash;
        const sender = new TxCanceller(tx_hash);
        sender.send()
            .then((result) => {
                const page = new Page(1, "Result of send transaction");
                res.render('pf6200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });

    app.get("/PF7000", (req: any, res) => {
        const page = new Page(1, "Send Random Transaction 2");
        res.render('pf7000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });


    app.get("/PF7200", (req: any, res) => {
        const sender = new RandomTxSender2In();
        sender.send()
            .then((result:any) => {
                const page = new Page(1, "Result of send transaction");
                res.render('pf7200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
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

    app.post("/PG1200", (req: any, res) => {
        let data:IProposalFeeLinkData = JSON.parse(req.body.link_data);
        let sender = new ProposalFeeSender(data);
        sender.send()
            .then((result) => {
                const page = new Page(2, "Result of proposal fee transfer");
                res.render('pg1200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });

    app.get("/PG2000", (req: any, res) => {
        const page = new Page(2, "Voting Fee & Proposal Data Transfer");
        res.render('pg2000',
            {
                title: page.getTitle(),
                menu: page.getMenu()
            });
    });

    app.post("/PG2200", (req: any, res) => {
        let data:IVotingFeeLinkData = JSON.parse(req.body.link_data);
        let sender = new VotingFeeSender(data);
        sender.send()
            .then((result) => {
                const page = new Page(2, "Result of voting fee transfer");
                res.render('pg2200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
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

    app.post("/PG3200", (req: any, res) => {
        let data:IVoteLinkData = JSON.parse(req.body.link_data);
        let sender = new VoteSender(data);
        sender.send()
            .then((result) => {
                const page = new Page(2, "Result of vote");
                res.render('pg3200',
                    {
                        title: page.getTitle(),
                        menu: page.getMenu(),
                        result: result
                    });
            });
    });
};
