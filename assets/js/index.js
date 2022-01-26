// TODO: INIT APP

const api = new API_SERVER();

(async () => {
	await api.init();

	const { name, schedule } = api.store.get();

	//? name contain => render main
	if (name) {
		api.render.Main(name, schedule);
		if (!schedule.length && (await api.checkCookie())) api.getSchedule();
	} else {
		//? render authentication page
		api.render.Login();
	}
})();
