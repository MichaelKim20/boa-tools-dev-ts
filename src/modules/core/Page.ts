
import { StringBuilder } from "../utils/StringBuilder";

export class Page {

    private readonly group: number;
    private readonly title: string;

    constructor(group: number, title: string) {
        this.group = group;
        this.title = title;
    }

    getTitle() {
        return this.title;
    }

    getMenu() {
        const builder = new StringBuilder();
        builder.append("        <div data-role=\"panel\" id=\"nav-panel\" data-position-fixed=\"true\" data-theme=\"a\" data-display=\"overlay\" >\n");
        builder.append("			<ul data-role=\"listview\" data-theme=\"a\">\n");
        builder.append("				<li data-icon=\"delete\"><a href=\"#\" data-rel=\"close\">닫기</a></li> \n");
        builder.append("				<div data-role=\"collapsible-set\" data-theme=\"c\" data-content-theme=\"a\" data-inset=\"true\" data-collapsed=\"false\">\n");

        if (this.group === 1)
            builder.append("					<div data-role=\"collapsible\" data-collapsed=\"false\" >\n");
        else
            builder.append("					<div data-role=\"collapsible\" data-collapsed=\"true\" >\n");

        builder.append("						<h2>Preferences</h2>\n");
        builder.append("						<ul data-role=\"listview\">\n");
        builder.append("							<li><a href=\"PF1000\" data-ajax=\"false\">Distribute Genesis Coins</a></li> \n");
        builder.append("							<li><a href=\"PF2000\" data-ajax=\"false\">Automatically send transactions</a></li> \n");
        builder.append("						</ul>\n");
        builder.append("					</div>\n");

        if (this.group === 2)
            builder.append("					<div data-role=\"collapsible\" data-collapsed=\"false\" >\n");
        else
            builder.append("					<div data-role=\"collapsible\" data-collapsed=\"true\" >\n");

        builder.append("						<h2>Proposal</h2>\n");
        builder.append("						<ul data-role=\"listview\">\n");
        builder.append("							<li><a href=\"PG1000\" data-ajax=\"false\">Proposal Fee Transfer</a></li> \n");
        builder.append("							<li><a href=\"PG2000\" data-ajax=\"false\">Vote Fee Transfer</a></li> \n");
        builder.append("							<li><a href=\"PG3000\" data-ajax=\"false\">Vote</a></li> \n");
        builder.append("						</ul>\n");
        builder.append("					</div>\n");
        builder.append("				</div>			\n");
        builder.append("				<li><a href=\"#\" data-ajax=\"false\">로그오프</a></li> \n");
        builder.append("			</ul>\n");
        builder.append("		</div><!-- /panel -->\n");
        return builder.toString();
    }
}
