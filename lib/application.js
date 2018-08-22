const path = require("path");
const KoaApplication = require("koa");
const delegates = require("delegates");
const Loader = require("./loader");
const Router = require("./router");

class Application extends KoaApplication {
	constructor(options) {
		super();

		options = Object.assign(
			{
				loader: new Loader({ app: this })
			},
			options || {}
		);
		this.options = options;
		this.loader = options.loader;
		this.config = {};
		this.controller = {};
		this.model = {};
		this.router = new Router();
	}

	init() {
		this.loader.loadConfig({
			directory: path.resolve(__dirname, "../config"),
			container: this.config
		});
		const loadPath = this.config.app.autoload;

		this.loader.loadController({
			directory: loadPath.controller
    });
    
    const dbConfig = this.config.database;
		this.loader.loadDatabase(dbConfig);

		this.loader.loadModel({ directory: loadPath.model });
		this.loader.loadRouter({ directory: loadPath.routes });

		this.delegate();

		this.use(this.router.routes()).use(this.router.allowedMethods());
	}

	run(port) {
		this.listen(port || 3000);
	}

	delegate() {
		delegates(this.context, "app")
			.getter("config")
			.getter("controller")
			.getter("model");
	}
}

module.exports = Application;
