const path = require("path");
const globby = require("globby");
const assert = require("assert");

class Loader {
	constructor(options) {
		assert(options.app, "options.app is required");
		this.app = options.app;
	}

	// 加载配置文件
	loadConfig(options) {
		const baseDir = options.directory;
		const container = this.app.config;
		const files = globby.sync(baseDir, {
			expandDirectories: { extensions: ["js"] }
		});

		files.map(file => {
			let required = require(file);
			let name = path.basename(file, path.extname(file));
			container[name] = required;
		});
	}

	// 加载控制器
	loadController(options) {
		const app = this.app;
		const baseDir = options.directory;
		const container = app.controller;
		const files = globby.sync(baseDir, {
			expandDirectories: { extensions: ["js"] }
		});

		const instances = new Map();

		files.map(file => {
			let required = require(file);
			let relative = path.dirname(path.relative(baseDir, file));
			let ctrlName =
				relative === "."
					? required.name
					: [...relative.split(path.sep), required.name].join(".");

			Object.defineProperty(container, ctrlName, {
				get: function() {
					if (instances.has(ctrlName)) {
						return instances.get(ctrlName);
					}
					const instance = new required(app);
					instances.set(ctrlName, instance);
					return instance;
				}
			});
		});
	}

	loadDatabase(config) {
		const Sequelize = require("sequelize");
		const app = this.app;

		if (!Array.isArray(config)) {
			config = [Object.assign({ name: "default" }, config)];
		}

		app.sequelize = {};
		config.map(item => {
			this.app.sequelize[item.name] = new Sequelize(
				item.database,
				item.username,
				item.password,
				{
					host: item.host,
					port: item.port,
					dialect: item.dialect || "mysql",
					pool: item.pool || {},
          timezone: "+08:00",
          operatorsAliases: false,
          dialectOptions: {
            dateStrings: true
          }
				}
			);
		});
	}

	// 加载Model
	loadModel(options) {
		const files = globby.sync(options.directory, {
			expandDirectories: { extensions: ["js"] }
    });
    // console.log(baseDir,files)

		files.map(file => {
			const model = require(file);
			const definitions = model.definitions;
			const sequelize = this.app.sequelize[definitions.source || "default"];
			const modelInstance = model.init(
				model.definitions.attributes,
				Object.assign({ sequelize: sequelize }, definitions.options || {})
      );
      this.app.model[modelInstance.name] = modelInstance;
		});
	}

	// 加载路由配置
	loadRouter(options) {
		const files = globby.sync(options.directory, {
			expandDirectories: { extensions: ["js"] }
		});

		files.map(file => {
			require(file)(this.app.router, this.app.controller);
		});
	}
}

module.exports = Loader;
