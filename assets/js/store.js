class Store {
	data = {
		name: "",
		program: "",
		schedule: [],
		term: "",
		week: null,
		year: "",
		theme: "dark",
	};
	settingTheme = ["dark"];
	root = chrome.storage.local;
	constructor() {}
	init() {
		return new Promise(async (resolve) => {
			resolve(await this.getData());
		});
	}
	set(object) {
		this.data = { ...this.data, ...object };
		this.save();
	}
	get(key = null) {
		return key ? this.data[key] : this.data;
	}
	getData(keys = null) {
		return new Promise((resolve) =>
			this.root.get(keys, (results) => {
				this.set(results);
				resolve(results);
			})
		);
	}
	save() {
		this.root.set(this.data);
	}
	clear() {
		this.root.clear();
	}
}
