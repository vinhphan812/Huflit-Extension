class Render {
	root = $("#root");
	menu = ["Schedule", "Mark", "Password", "Logout"];
	dayOfWeek = [
		"Thứ 2",
		"Thứ 3",
		"Thứ 4",
		"Thứ 5",
		"Thứ 6",
		"Thứ 7",
		"Chủ Nhật",
	];
	time = {
		1: { s: "06h45", e: "07h35" },
		2: { s: "07h35", e: "08h25" },
		3: { s: "08h25", e: "09h15" },
		4: { s: "09h30", e: "10h20" },
		5: { s: "10h20", e: "11h10" },
		6: { s: "11h10", e: "12h00" },
		7: { s: "12h45", e: "13h35" },
		8: { s: "13h35", e: "14h25" },
		9: { s: "14h25", e: "15h15" },
		10: { s: "15h30", e: "16h20" },
		11: { s: "16h20", e: "17h10" },
		12: { s: "17h10", e: "18h15" },
		13: { s: "18h15", e: "19h05" },
		14: { s: "19h05", e: "19h55" },
		15: { s: "19h55", e: "20h45" },
		start: (t) => this.time[t].s,
		end: (t) => this.time[t].e,
	};
	constructor() {
		window.addEventListener("offline", (e) => {
			api.state = false;
			this.root.addClass("offline").removeClass("online");
			console.log("offline");
		});
		window.addEventListener("online", (e) => {
			api.state = true;
			this.root.addClass("online").removeClass("offline");
			console.log("online");
		});
	}
	Login() {
		const LoginButton =
			'<button class="btn btn-primary" id="login">Đăng Nhập Bằng Portal</button>';
		this.root.html(LoginButton);

		$("#login").click(() => api.auth(api.getSchedule));
	}
	main(name = "", schedule = []) {
		const list = this.menu.map(
			(item) =>
				`<li id="${item}"><img src="./assets/img/${item}.png"/><span>${item}</span></li>`
		);

		effectLogin();

		$("#menu")
			.html(
				`<div class="user">🏆 ${name.split("|")[1]}</div>
				<ul>${list.join("")}</ul>`
			)
			.addClass("opacity");

		$("#Logout").click(() => api.Logout());
		$("#Schedule").click(() => api.getSchedule());
		$("#Mark").click(() => api.getMark());
		$("#Password").click(() => this.password());

		if (schedule.length) {
			this.schedule(schedule);
		}

		function effectLogin() {
			$("#login").remove();
			$("#root").css("hidden");
			$("body").css("height", "500px");
			$("#box-title").removeClass("col");
		}
	}
	schedule(schedule) {
		filter = filter.bind(this);
		renderSubject = renderSubject.bind(this);

		const today = getToday();
		const listOfDays = this.dayOfWeek
			.map((item, index) => `<li id="${index}">${item}</li>`)
			.join("");
		let html = `<div class="schedule">
					<ul class="listOfDays">${listOfDays}</ul>
					<ul class="renderData"></ul>
				</div>`;

		this.root.html(html);

		const $listOfDays = $(".listOfDays"),
			$renderData = $(".renderData");

		for (var i = 0; i < 7; i++) {
			const day = $(`#${i}`, $listOfDays);

			render(i);

			if (i == today) {
				$(`#t${i}`, $renderData).addClass("active");
				day.addClass("active").text("Hôm nay");
			}

			day.click(function () {
				activeDisplay($listOfDays, $(this));
				activeDisplay($renderData, $(`#t${this.id}`, $renderData));
			});
		}

		function render(i) {
			const enpty =
				"<div class='active align-items-center d-flex fs-1 fw-bold justify-content-center text-muted h-100'>Trống</div>";
			var data = filter(i).map(renderSubject).join("");

			const p =
				data.length == 0
					? enpty
					: `<ul class="list-group list-group-flush overflow-auto h-100">
					${data}</ul>`;
			$(`.renderData`).append(`<li id="t${i}">${p}</li>`);
		}

		function renderSubject(item) {
			const [s, e] = item.TietHoc.split("-");

			return `<li class="list-group-item pe-4">
					<div class="subject">
						<div class="duration">
							<div>${this.time.start(s)}</div>
							<div>${this.time.end(e)}</div>
						</div>
					<div class="info">
						<div class="name">${item.MonHoc}</div>
						<small class="teacher">👨‍🏫 ${item.GiaoVien}</small>
					</div>
					<small class="room">${item.Phong}</small>
				</div>
		 	</li>`;
		}
		function filter(i) {
			return schedule.filter((item) => {
				if (item.Thu == this.dayOfWeek[i]) return item;
			});
		}

		function activeDisplay(query, active) {
			const a = "active";
			query.children().removeClass(a);
			return active.addClass(a);
		}

		function getToday() {
			const today = new Date().getDay();
			return today == 0 ? 6 : today - 1;
		}
	}
	mark(mark) {
		const a = `<div class="mark">
					<ul class='list-group list-group-flush overflow-auto'>
						${mark.map(renderItem).join("")}
					</ul>
					<div class="total">
						<div>Total: </div>
						<div>Passed: </div>
						<div>Failed: </div>
					</div>
				</div>`;
		this.root.html(a);
		$(".alert-primary .progress").remove();
		total();

		$(".survey").click(async function () {
			const { success, msg } = await api.survey(
				$(this).attr("data-url")
			);
			if (success) $(this).remove();
		});

		function total() {
			const query = [".alert", ".alert-success", ".alert-danger"];
			for (const i in query) render(i);

			function render(index) {
				$(`.total>div:nth(${index})`).text(function () {
					return this.textContent + $(query[index]).length;
				});
			}
		}

		function renderItem(i) {
			if (i.isDone && i.detailCode) scroreDetail(i.detailCode);

			return `<li class="sub alert alert-${
				!i.isDone ? "primary" : checkPassed(i.passed)
			}">
				${renderInfo(i)}
				<div class="scoreDetail" id="${i.detailCode}">
					${renderProgress()}	
				</div>
		</li>`;
		}

		function renderInfo(i) {
			return `<div class="d-flex info">
					<div class="name">${i.name}</div>
					${surveyOrScore(i)}
				</div>`;
		}

		function renderProgress() {
			return `<div class="progress">
					<div class="progress-bar"></div>
				</div>`;
		}

		function renderSurvey(survey) {
			return `<button class="btn btn-primary survey" data-url="${survey}">Survey</button>`;
		}
		function surveyOrScore(data) {
			return data.survey
				? renderSurvey(data.survey)
				: renderScore(data.numberScore, data.wordScore);
		}
		function renderScore(number = "--", word = "--") {
			return `<div class="wordScore">${word}</div>
			<div class="score">${number}</div>`;
		}
		function checkPassed(flag) {
			return flag ? "success" : "danger";
		}
		async function scroreDetail(detail) {
			$("#load").append(`<div id="${detail}"></div>`);
			const listScore = await api.getDetailMark(detail),
				el = $(".sub #" + detail);

			if (!listScore.length) $(".progress", el).remove();

			for (const { content, score } of listScore) {
				$(".progress-bar", el).animate(
					{
						width: "100%",
					},
					1000
				);
				$(".progress-bar", el).css("width", "100%");

				setTimeout(() => {
					$(".progress", el).remove();
					el.append(
						`<div class="scoreComponent"><div class="content">${content}</div><div class="score">${score}</div></div>`
					);
				}, 1100);
			}
		}
	}
	password() {
		this.root.html("password");
	}
}
