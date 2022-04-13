// TODO: INIT APP

const api = new API_SERVER();

(async () => {
	await api.init();

	const { name, schedule, duration } = api.store.get();

	//? contain user data => render main
	if (name) {
		api.render.Main(name, schedule, duration);
		if (!schedule.length && (await api.checkCookie())) api.getSchedule();
	} else {
		//? render authentication
		api.render.Login();
	}
})();
