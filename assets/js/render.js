class Render {
	menu = ["Schedule", "Mark", "Exam", "Setting"];
	vnMenu = ["TKB", "Điểm", "Lịch Thi", "Xem thêm"];
	menuIcon = ["calendar3", "award", "card-list", "three-dots"];
	settingMenu = [
		{
			id: "studyProgram",
			name: "Chương trình đào tạo",
			icon: "mortarboard",
			isAction: true,
		},
		{
			id: "finance",
			name: "Tài chính sinh viên",
			icon: "cash-coin",
			isAction: true,
		},
		{
			id: "scheduleById",
			name: "Tra cứu thời khóa biểu",
			icon: "calendar-event",
			isAction: true,
		},
		// {
		// 	id: "report",
		// 	name: "Báo cáo sự cố",
		// 	icon: "exclamation-circle",
		// 	isAction: true,
		// },
		{
			id: "logout",
			name: "Đăng Xuất",
			icon: "box-arrow-right",
		},
	];
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
	constructor(store, root = $("#root")) {
		this.root = root;
		this.historyTab = "";
		this.store = store;
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
		const LoginButton = `<button class="btn btn-primary my-4" id="login">Đăng Nhập Bằng Portal</button>
						<div id="info" class="d-flex flex-column align-items-center fs-6 mt-auto">
							<div class="mt-2 d-inline-block">
								<span>💬 Chatbot Messenger tra cứu </span>
								<a href="https://m.me/102388311946462" target="_blank" class="">
									Thời Khóa Biểu
								</a>
							</div>
							<div class="mt-2">
								<span>🚀 Developed by </span>
								<a href="https://fb.com/100008074634782" target="_blank">Vinh Phan</a>
							</div>
						</div>`;

		this.root.html(LoginButton);
		this.historyTab = "login";

		$("#login").click(() => api.auth(api.getSchedule));
	}
	Main(name = "", schedules = [], duration) {
		const list = this.menu.map(
			(item, index) =>
				`<li id="${item}">
					<i class="bi bi-${this.menuIcon[index]} fs-1"></i>
					<span>${this.vnMenu[index]}</span>
				</li>`
		);

		effectLogin();

		$("#menu")
			.html(
				`<div class="user">🏆 ${name.split("|")[1]}</div>
				<ul>${list.join("")}</ul>`
			)
			.addClass("opacity");

		// $("#Logout").click(() => api.Logout());
		$("#Setting").click(async () => {
			if (!(await api.checkCookie())) return api.auth(this.Setting);

			this.historyTab != "setting" && this.Setting();
		});
		$("#Schedule").click(
			() => this.historyTab != "schedule" && api.getSchedule()
		);
		$("#Mark").click(() => this.historyTab != "mark" && api.getMark());
		$("#Exam").click(() => this.historyTab != "exam" && api.getExam());

		if (schedules.length) {
			this.Schedule(schedules, duration);
		}

		function effectLogin() {
			$("#login").remove();
			$("#root").css("hidden");
			$("#info").remove();
			$("body").css("height", "500px");
			$("#box-title").removeClass("col");
		}
	}
	Schedule(schedules, duration, root = this.root) {
		filter = filter.bind(this);
		renderSubject = renderSubject.bind(this);

		const today = getToday();
		const listOfDays = this.dayOfWeek
			.map((item, index) => `<li id="${index}">${item}</li>`)
			.join("");
		let html = `<div class="schedule">
					<div class="alert-primary">${duration}</div>
					<ul class="listOfDays">${listOfDays}</ul>
					<ul class="renderData"></ul>
				</div>`;

		root.html(html);
		this.historyTab = "schedule";

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

		function renderSubject({ MonHoc, TietHoc, GiaoVien, Phong }) {
			const [s, e] = TietHoc.split("-");

			return `<li class="list-group-item pe-4">
					<div class="subject">
						<div class="duration">
							<div>${this.time.start(s)}</div>
							<div>${this.time.end(e)}</div>
						</div>
					<div class="info">
						<div class="name">${MonHoc}</div>
						${GiaoVien ? `<small class="teacher">👨‍🏫 ${GiaoVien}</small>` : ""}
					</div>
					<small class="room">${Phong}</small>
				</div>
		 	</li>`;
		}
		function filter(i) {
			return schedules.filter((item) => {
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
	Mark(marks) {
		return new Promise(async (resolve, rreject) => {
			const a = `<div class="mark">
						<ul class='list-group list-group-flush overflow-auto'>
							${marks.map(renderItem).join("")}
						</ul>
						<div class="total">
							<div>Total: --</div>
							<div>Passed: --</div>
							<div>Failed: --</div>
						</div>
					</div>`;
			this.root.html(a);
			this.historyTab = "mark";

			total();

			for (const { isDone, detailCode } of marks) {
				//TODO phải delay để server trường có thể phản hồi
				await delay();
				if (isDone && detailCode) await scroreDetail(detailCode);
			}

			$("#load").html("");

			$(".survey").click(async function () {
				const { success, msg } = await api.survey(
					$(this).attr("data-url")
				);
				if (success) $(this).remove();
			});
		});

		function total() {
			const query = [".alert", ".alert-success", ".alert-danger"];
			for (const i in query) render(i);

			function render(index) {
				$(`.total>div:nth(${index})`).text(function () {
					return (
						this.textContent.replaceAll("-", "") +
						$(query[index]).length
					);
				});
			}
		}

		function renderItem(i) {
			return `<li class="sub alert alert-${
				!i.isDone ? "primary" : checkPassed(i.passed)
			}">
				${renderInfo(i)}
				<div class="scoreDetail" id="${i.detailCode}">
					${i.isDone && i.detailCode ? renderProgress() : ""}	
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
			return `<button class="btn link-primary text-decoration-underline survey" data-url="${survey}">đánh giá</button>`;
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
	Exam(exams) {
		this.root.html(
			`<div class="exams">
				<ul class='list-group list-group-flush overflow-auto'>
				</ul>
			</div>`
		);

		this.historyTab = "exam";

		if (exams.length) return $(".exams ul").html(exams.map(renderItem));

		$(".exams")
			.html(`<div class="mx-1 d-flex justify-content-center align-items-center h-100">
			<div class="h4 text-muted">Chưa có lịch thi cho kì này!</div>
		</div>`);

		function renderItem(e) {
			return `<li class="alert alert-primary mx-1">
				<div class="h5 d-flex justify-content-between">
					<div>${e.name}</div>
					<div>${e.room}</div>
				</div>
				<div class="text-muted d-flex justify-content-between">
					<div>${`${e.time} ${e.date}`}</div>
					<div>${e.duration + " phút"}</div>
					<div>${e.location}</div>
				</div>
			</li>`;
		}
	}
	Setting() {
		optionWeekTerm = optionWeekTerm.bind(this);
		searchClick = searchClick.bind(this);

		let offcanvas;

		const html = `<div class="list-group list-group-flush w-100 h-100 mt-4 settings"></div>
			<div class="offcanvas offcanvas-bottom h-100" tabindex="-1" id="offcanvasRight" aria-labelledby="offcanvasRightLabel">
				<div class="offcanvas-header">
					<div class="name h3 m-0">
						<i class="bi bi-palette"></i>
						<span>Theme</span>
					</div>
					<button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
				</div>
				<div class="offcanvas-body d-flex flex-column"></div>
			</div>`;

		this.root.html(html);

		this.historyTab = "setting";
		//#region  init
		const menuSettings = this.settingMenu.map(
			({ id, name, icon, isAction }) => `
		<button id="${id}" class="list-group-item list-group-item-action fs-5 ${
				isAction ? "btn-offcanvas" : id
			}">
			<i class="me-2 bi bi-${icon}"></i>
			<span>${name}</span>
		</button>`
		);

		$(".settings").html(menuSettings);

		offcanvas = new bootstrap.Offcanvas($("#offcanvasRight")[0]);
		$(".settings>button:not(.logout)").click(async function () {
			const btn = $(this);

			$(".offcanvas-body").html("");

			// render name
			$(".offcanvas>.offcanvas-header>.name").html(btn.html());

			// show tab
			offcanvas.show();

			// get route
			const page = await checkTab(btn[0].id);

			// render body
			$(".offcanvas-body").html(page);
		});
		$("button.logout").click(() => api.Logout());

		$("#offcanvasRight").css("visibility", "hidden").removeClass("show");
		$(".offcanvas-backdrop.fade.show").remove();

		//#endregion

		async function checkTab(id) {
			try {
				let html = "";
				switch (id) {
					case "studyProgram":
						html = await studyProgram();
						break;
					case "finance":
						html = await finance();
						break;
					case "scheduleById":
						html = `<div class="d-flex align-items-center">
									<input type='text' class='form-control me-1 w-50' id='idStudent' placeholder='Mã sinh viên, giảng viên' list="datalistOptions" required/>
									<datalist id="datalistOptions">
										${await loadProfessors()}
									</datalist>
									<select class="form-select w-25 me-1" aria-label="week" id="week">
										${await optionWeekTerm()}
									</select>
									<button class="btn btn-primary my-2" id="search">Tra cứu</button>
								</div>
								<div class="d-flex flex-column justify-content-center align-items-center flex-grow-1" id="schedule"></div>`;

						const reg = setInterval(() => {
							if (!$("#search").length) return;

							$("#search").click(searchClick);

							clearInterval(reg);
						}, 10);

						break;
					case "report":
						// html = `<div class="alert alert-warning">Chỉ sử dụng tính năng này khi có lỗi xảy ra</div>
						// 	<div>Gửi báo cáo đến thời khóa biểu</div>
						// 	<div class="form-floating">
						// 		<textarea class="form-control" placeholder="Nội dung báo cáo" id="floatingTextarea"></textarea>
						// 		<label for="floatingTextarea">Báo cáo sự cố</label>
						// 	</div>`;
						html = `<div class='h-100 d-flex justify-content-center align-items-center'><div class='text-muted fs-3'>COMING SOON</div></div>`;
						break;
					default:
						html =
							"<div class='h-100 d-flex justify-content-center align-items-center'><div class='text-muted fs-3'>Không Tìm Thấy!</div></div>";
						break;
				}
				return html;
			} catch (error) {
				console.log(error);
				return "<div class='h-100 d-flex justify-content-center align-items-center'><div class='text-muted fs-3'>Xảy Ra Lỗi!</div></div>";
			}
		}
		async function searchClick(e) {
			const regsCheck = /\d{2}dh\d{6}|\d{5}|\D{2}\d{4}/i;
			const [id] = $("#idStudent").val().split(" - ");
			const week = $("#week").val();
			if (!id) {
				console.log("Vui Lòng điền thông tin cần tra cứu!");
				return;
			}
			if (!regsCheck.test(id)) {
				console.log("Mã số định đạng không đúng");
				return;
			}

			const schedule = await api.getScheduleById(id, week);

			this.Schedule(schedule.data, schedule.name, $("#schedule"));
		}
		async function loadProfessors() {
			const professors = await api.getListProfessor();

			return professors.map((e) => `<option value="${e}">`).join("");
		}
		async function optionWeekTerm() {
			const weeks = await api.getWeeks();
			return weeks
				.map((e, i) => `<option value="${e}">${i + 1}</option>`)
				.join("");
		}
		async function studyProgram() {
			const res = await api.getStudyProgram();

			return `<div class="accordion" id="studyAccordion">
					${res.map(renderAccordion(renderHeader, renderBody)).join("")}
				</div>`;

			function renderHeader({ name, totalCredit }) {
				return `<div class="fw-bold">${name}</div><div class="ms-5 text-muted">Số tín chỉ: ${totalCredit}</div>`;
			}
			function renderBody(data) {
				return data.data.map(renderStudyItem).join("");

				function renderStudyItem(item) {
					const {
						id,
						name,
						credit,
						theory,
						practical,
						faculty,
					} = item;
					return `<div id="${id}" class="alert alert-primary">
								<div class="h5">${name}</div>
								<div class="text-muted">${faculty}</div>
								<div class="d-flex justify-content-between fs-6">
									<div>Tín Chỉ: ${credit}</div>
									${theory ? `<div>Lý Thuyết: ${theory}</div>` : ""}
									${practical ? `<div>Thực Hành: ${practical}</div>` : ""}
									
								</div>
							</div>`;
				}
			}
		}
		async function finance() {
			const { data, debt, paid, total } = await api.getFinance();
			return `<div class="alert alert-primary w-75 mx-auto">
				<div class="h3">Thống kê</div>
				<table class="w-75 ms-2">
					<tbody>
						<tr>
							<td>Tổng tiền</td>
							<td>: ${total}</td>
						</tr>
						<tr>
							<td>Đã đóng</td>
							<td>: ${paid}</td>
						</tr>
						<tr>
							<td>Còn nợ</td>
							<td>: ${debt}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div class="accordion" id="studyAccordion">
				${data.map(renderAccordion(renderHeader, renderBody)).join("")}
			</div>`;
			function renderHeader({ year, term, fee, paid, debt }) {
				return `<div class="fw-bold me-5">${year} ${term}</div><div class="${
					parseNumber(debt) <= 0 ? "text-muted" : "text-danger"
				}">${fee}</div>`;
			}
			function renderBody({ debt, data, deadline }) {
				return `<div class="badge mb-2 ${
					parseNumber(debt) > 0 ? "bg-danger" : ""
				}">
						${parseNumber(debt) > 0 ? `Hạn chót: ${deadline}` : ""}
					</div>
						<ul class="list-group">
						${data.map(renderItem).join("")}
					</ul>`;
				function renderItem({
					name,
					paymentDate,
					fee,
					paid,
					debt,
				}) {
					debt = parseNumber(debt);
					return `<li class="list-group-item">
						<div class="d-flex align-items-center">
							<div class="flex-grow-1 d-flex flex-column justify-content-between">
								<div class="h6">${name}</div>
								<div class="fw-bold">${fee}</div>
								${
									debt == 0
										? ""
										: debt > 0 && paid != "0"
										? `<div class="text-danger">Đóng thiếu: ${debt}</div>`
										: `<div class="text-info">Đóng dư: ${debt}</div>`
								}
								
							</div>
							<div class="badge ${debt > 0 ? "bg-danger" : "bg-success"}">
									<i class="fs-6 bi bi-${debt > 0 ? "x" : "check"}"></i>						
							</div>
						</div>
					</li>`;
				}
			}

			function checkEnough(fee, paid) {
				return parseNumber(fee) <= parseNumber(paid);
			}
			function parseNumber(str) {
				return Number(str.replace(/,/g, ""));
			}
		}

		function renderAccordion(renderHeader, renderBody) {
			return (e, i) => {
				return `<div class="accordion-item">
					<div class="accordion-header h2" id="header-${i}">
						<button class="accordion-button collapsed" type="buttom" data-bs-toggle="collapse" data-bs-target="#collapse-${i}" aria-controls="collapse-${i}">
							${renderHeader(e)}
						</button>
					</div>
					<div id="collapse-${i}" class="accordion-collapse collapse" aria-labelledby="header-${i}" data-bs-parent="#studyAccordion">
						<div class="accordion-body">
							${renderBody(e)}
						</div>
					</div>
				</div>`;
			};
		}
	}
}
