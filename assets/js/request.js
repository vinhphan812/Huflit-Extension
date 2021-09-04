class API_SERVER {
	host = "portal.huflit.edu.vn";
	constructor() {
		this.data = {};
		this.isRender = false;
		this.render = new Render();
	}
	setData(data) {
		if (data.name) {
			this.render.main(data.name, data.schedule);
			this.isRender = true;
			this.data = data;
		} else this.render.Login();
	}
	requestServer(
		data = { link, URI: { path: "", query: {} }, form: "", json: false }
	) {
		const url =
				data.link ||
				makeURL({
					host: data.URI.host || this.host,
					path: data.URI.path,
					query: data.URI.query,
				}),
			option = {
				method: typeof data.form == "object" ? "POST" : "GET",
				headers: {
					"Content-Type": data.json
						? "application/json"
						: "application/x-www-form-urlencoded",
				},
				credentials: "same-origin",
			};

		if (data.form)
			option.body = data.json
				? JSON.stringify(data.form)
				: formData(data.form);

		return fetch(url, option);
	}
	requestLoad(requestOption, query) {
		return new Promise(async (resolve, reject) => {
			let res = await this.requestServer(requestOption);

			resolve(await loadHtml(res, query));
		});
	}
	auth(doneCallback) {
		if (this.winId)
			return chrome.windows.update(this.winId, { focused: true });
		else
			return new Promise(async (resolve, reject) => {
				checkTabLogin = checkTabLogin.bind(this);
				closeTabLogin = closeTabLogin.bind(this);
				doneCallback = doneCallback.bind(this);

				const win = await chrome.windows.create({
						url: "https://portal.huflit.edu.vn/Login",
						height: 800,
						width: 500,
						top: Math.round(screen.availHeight / 2 - 400),
						left: Math.round(screen.availWidth / 2 - 250),
						type: "popup",
					}),
					home = "https://portal.huflit.edu.vn/Home",
					idLogin = win.tabs[0].id;

				this.winId = win.id;

				chrome.tabs.onRemoved.addListener(closeTabLogin);
				chrome.tabs.onUpdated.addListener(checkTabLogin);

				function closeTabLogin(tabId) {
					if (tabId != idLogin) return;
					this.winId = "";
					clearEvent();
					return resolve(false);
				}

				function checkTabLogin(tabId, state, tab) {
					if (state.status == "complete") {
						if (tabId == idLogin && tab.url == home) {
							chrome.tabs.remove(tabId);
							clearEvent();
							doneCallback();
							resolve(true);
						}
					}
				}
				function clearEvent() {
					chrome.tabs.onRemoved.removeListener(closeTabLogin);
					chrome.tabs.onUpdated.removeListener(checkTabLogin);
				}
			});
	}
	checkCookie() {
		return new Promise(async (resolve, reject) => {
			await this.requestLoad({ URI: { path: "/Home" } });

			if ($("#load>title").text() == "Đăng nhập") {
				return resolve(false);
			}

			const name = $(".stylecolor>span:not(.caret)").text();

			if (!this.isRender || this.data.name != name) {
				this.data.name = name;
				this.render.main(name);
				this.isRender = true;
			}
			setDataLocal(this.data);

			resolve(true);
		});
	}
	getSchedule() {
		return new Promise(async (resolve, reject) => {
			//check cookie expire
			if (!(await this.checkCookie(() => {})))
				return this.auth(this.getSchedule);

			let { year, term, week } = this.data;

			if (!year && !term && !week) {
				await this.requestLoad({
					URI: { path: "/Home/Schedules" },
				});

				const select = $("#load select");

				year = getOptionVal(select[0]);
				term = getOptionVal(select[1]);
				week = +getOptionVal(select[2]) + 5;

				this.data = { year, term, week };

				setDataLocal(this.data);
			}
			const res = [];

			await this.requestLoad({
				URI: {
					path: "/Home/DrawingSchedules",
					query: {
						YearStudy: year,
						TermID: term,
						Week: week,
						t: 0.567326047277148,
					},
				},
			});

			$("#load .Content").each(function () {
				res.push(new Subject($(this)));
			});

			this.data.schedule = res;
			setDataLocal(this.data);
			this.render.schedule(res);
			resolve({ success: true, data: res });
		});

		function Subject(data) {
			this.Thu = data.attr("title");
			this.Phong = getChild(data, 1).text();
			this.MonHoc = splitText(getChild(data, 3));
			this.TietHoc = splitText(getChild(data, 9), 1);
			this.GiaoVien = splitText(getChild(data, 11), 1);
		}

		function splitText(query, selectIndex = 0, reg = / \(|: /g) {
			return query.text().split(reg)[selectIndex] || "Unknown";
		}
		function getChild(data, i) {
			return data.children(`:nth-child(${i})`);
		}
		function getOptionVal(select) {
			return $("option:selected", select).val();
		}
	}
	getMark() {
		return new Promise(async (resolve, reject) => {
			const check = await this.checkCookie();
			if (!check) return this.auth(this.getMark);

			let { program } = this.data;

			if (!program) {
				await this.requestLoad({ URI: { path: "/Home/Marks" } });
				program = $("#load #ddlStudyProgram>option").val();
				this.data = { program };
				setDataLocal(this.data);
			}
			await this.requestLoad({
				URI: {
					path: "/Home/ShowMark",
					query: {
						StudyProgram: program,
						YearStudy: 0,
						TermID: 0,
					},
				},
			});
			let res = new Array();
			$("#load tbody>tr:not(:first)").each(function () {
				if ($(this).attr("style") || $("td", this).length < 4)
					return;
				const sub = $("td", this);
				res = res.filter((item) => {
					if ($(sub[2]).text() != item.name) return item;
				});
				res.push(new Subject(sub));
			});
			this.render.mark(res);
			resolve({ success: true, data: res });
		});

		function filterContain(data, check) {
			return data.filter((item) => {
				if (check != item.name) return;
			});
		}
		function Subject(data) {
			const survey = $("a", data[4]).attr("href"),
				numberScore = $(data[4]).text().trim(),
				wordScore = $(data[5]).text().trim();

			this.code = $(data[1]).text();
			this.name = $(data[2]).text();
			this.credits = $(data[3]).text();
			this.isDone = !!wordScore;

			if (wordScore) {
				this.numberScore = numberScore;
				this.wordScore = $(data[5]).text().trim();
				this.passed = $("img", data[6])
					.attr("title")
					.includes("qua");
			} else {
				this.survey = survey || null;
			}

			this.detailCode = $("img", data[7])
				.attr("onclick")
				.split("'")[1];
		}
	}
	getDetailMark(detail) {
		const listScore = [],
			select = "tbody>tr:not(:first)";
		return new Promise(async (resolve, reject) => {
			try {
				await this.requestLoad(
					{ URI: { path: "/Home/ShowMarkDetail/" + detail } },
					`> #${detail}`
				);
				$(select, "#load > #" + detail).each(function () {
					listScore.push(extractData(this));
				});

				resolve(listScore.reverse());
			} catch (error) {
				console.log(error);
			}
		});
		function extractData(el) {
			return {
				score: $("td:nth(2)", el).text() || "----",
				content: $("td:nth(1)", el).text(),
			};
		}
	}
	survey(url, type) {
		const host = "esurvey.huflit.edu.vn",
			path = "/FrontEnd/VoteRatingTemplate/Vote.aspx/GetData";

		return new Promise(async (resolve, reject) => {
			if (url == "null")
				return resolve({
					success: false,
					msg: "Không tìm thấy đường dẫn đánh giá",
				});
			const urlSearchParams = new URLSearchParams(
				url.split("aspx")[1]
			);
			const params = Object.fromEntries(urlSearchParams.entries());

			await this.requestServer({ link: url });

			const data = await (
				await this.requestServer({
					URI: { host, path },
					form: {
						curClassId: params.classId,
						sid: params.SID,
						studyYearId: params.studyYearId,
						termId: params.TermID,
					},
				})
			).json();

			var res = await (
				await this.requestServer({
					link: url.split("?")[0] + "/SendAnswer",
					form: rating(data),
					json: true,
				})
			).json();

			if (res.d == "OK") resolve({ success: true, msg: res });
			else resolve({ success: false, msg: res });

			function rating(data) {
				let { RatingTemplate } = data;

				for (let parent in RatingTemplate) {
					var questions = RatingTemplate[parent].QuestionDTOs,
						answer = RatingTemplate[parent].AnswerDTOs;
					for (var i in questions) {
						if (answer.length) {
							questions[i] = checkAnswer(
								questions[i],
								answer[type].Id
							);
						} else
							questions[i].AnswerDTOs[0].TextAnswer =
								"Khong";
					}
					RatingTemplate[parent].QuestionDTOs = questions;
				}
				data.RatingTemplate = RatingTemplate;
				return JSON.parse(data);
			}
			function checkAnswer(question, answerId) {
				if (!question.ChildQuestions)
					question.RadioAnswerValue =
						question.Id + "_" + answerId;
				else {
					var le = question.ChildQuestions.length;
					for (var i = 0; i < le; i++)
						question.ChildQuestions[i] = checkAnswer(
							question.ChildQuestions[i],
							answerId
						);
				}

				return question;
			}
		});
	}
	ChangePass() {}
	Logout() {
		this.requestServer({ URI: { path: "/Login/Logout" } });
		document.location.href = "/popup.html";
		clearDataLocal();
	}
}
const api = new API_SERVER();

(async () => {
	api.setData(await getDataLocal());
	await api.checkCookie();
	if (!api.data.schedule && api.data.name) api.getSchedule();
})();
