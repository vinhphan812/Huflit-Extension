const URL_DATA = {
	URI: { path: "", query: {}, host: "portal.huflit.edu.vn" },
	form: "",
	json: false,
};

class API_SERVER {
	host = "portal.huflit.edu.vn";
	isRender = false;
	constructor() {
		this.store = new Store();
		this.render = new Render(this.store);
	}

	init() {
		return new Promise(async (resolve) => {
			if (this.store) await this.store.init();
			resolve(true);
		});
	}

	//TODO: send request to server
	requestServer(data = URL_DATA) {
		const isPOST = typeof data.form == "object",
			url =
				typeof data.URI == "string"
					? data.URI
					: makeURL({
							...data.URI,
							host: data.URI.host || this.host,
					  });

		const option = {
			method: isPOST ? "POST" : "GET",
			mode: "cors",
			headers: {
				"Content-Type":
					(data.json
						? "application/json"
						: "application/x-www-form-urlencoded") +
					"; charset=UTF-8",
			},
			credentials: "same-origin",
		};

		//? formData for body
		if (data.form) {
			option.body = data.json
				? JSON.stringify(data.form)
				: new URLSearchParams(data.form).toString();
		}

		//? send request
		return fetch(url, option);
	}

	requestLoad(requestOption, query) {
		return new Promise(async (resolve) => {
			const res = await this.requestServer(requestOption);
			await loadHtml(res, query);
			resolve(res);
		});
	}

	//TODO: hàm yêu cầu đăng nhập đến người dùng Extension chrome
	auth(callback) {
		//TODO: nếu tab đăng nhập tồn tại thì mở lên không cần tạo tab mới
		if (this.winId)
			return chrome.windows.update(this.winId, { focused: true });

		return new Promise(async (resolve) => {
			//TODO: tạo ràng buộc với cha
			checkAuthSuccess = checkAuthSuccess.bind(this);
			closeAuth = closeAuth.bind(this);
			callback = callback.bind(this);

			const win = await popupAuthTab(),
				homePath = "https://portal.huflit.edu.vn/Home",
				loginTab = win.tabs[0].id;

			//TODO: lưu trữ window id
			this.winId = win.id;

			//TODO: lắng nghe sự kiện kiểm tra TAB (hàm của google ráp callback vào là dùng)
			chrome.tabs.onRemoved.addListener(closeAuth);
			chrome.tabs.onUpdated.addListener(checkAuthSuccess);

			//TODO: hàm tạo ra cửa sổ yêu cầu đăng nhập
			function popupAuthTab() {
				return chrome.windows.create({
					url: "https://portal.huflit.edu.vn/Login",
					height: 800,
					width: 500,
					top: Math.round(screen.availHeight / 2 - 400),
					left: Math.round(screen.availWidth / 2 - 250),
					type: "popup",
				});
			}

			//TODO: callback kiểm tra trạng thái đăng nhập thành công
			function checkAuthSuccess(tabId, { status, url }, tab) {
				if (status == "loading" && url == homePath) {
					chrome.windows.remove(this.winId);
					clearEvent();
					//TODO: sau khi đăng nhập thành công, thực hiện tác vụ tiếp theo
					callback();
					this.winId = "";
					resolve(true);
				}
			}

			//TODO: callback khi sự kiện đóng tab xảy ra
			function closeAuth(tabId) {
				if (tabId != loginTab) return;
				this.winId = "";
				clearEvent();
				return resolve(false);
			}

			//TODO: hàm gỡ bỏ sự kiện khi đóng authentication tab hoặc quá trình đăng nhập kết thúc
			function clearEvent() {
				chrome.tabs.onRemoved.removeListener(closeAuth);
				chrome.tabs.onUpdated.removeListener(checkAuthSuccess);
			}
		});
	}

	checkCookie() {
		return new Promise(async (resolve) => {
			await this.requestLoad({
				URI: { path: "/Home/info" },
			});

			const title = $("#load>title").text();

			if (title == "" || title == "Đăng nhập") return resolve(false);

			const name = $(".stylecolor>span:not(.caret)").text();

			if (!this.isRender || this.store.get("name") != name) {
				this.store.set({ name });
				this.render.Main(name);
				this.isRender = true;
			}

			resolve(true);
		});
	}

	getSchedule() {
		return new Promise(async (resolve) => {
			//TODO: check cookie expire
			if (!(await this.checkCookie()))
				return this.auth(this.getSchedule);

			let { year, term, week } = this.store.get();

			//TODO: check week, term, year contain
			if (!year || !term || !week) {
				await this.requestLoad({
					URI: { path: "/Home/Schedules" },
				});

				const [yearOpt, termOpt, weekOpt] = $("#load select");

				year = getValue(yearOpt);
				term = getValue(termOpt);
				week = +getValue(weekOpt);

				this.store.set({ year, term, week });
			}
			const schedule = [];

			//TODO: load schedule
			await this.requestLoad({
				URI: {
					path: "/Home/DrawingSchedules",
					query: {
						YearStudy: year,
						TermID: term,
						Week: week,
					},
				},
			});

			//TODO: check end date and update week
			const duration = $("#load strong").text();
			let [, dateEnd] = duration.match(/\d{2}\/\d{2}\/\d{4}/g);

			if (checkNextWeek(dateEnd)) {
				this.store.set({ week: this.store.get("week") + 1 });
				const res = await this.getSchedule();

				//? nếu tìm thấy trả về kết quả
				if (res.success && res.data.length) return resolve(res);

				//? nếu không tìm thấy thời khóa biểu thì cập nhật năm, học kì, tuần
				this.store.set({ term: null });
				return;
			}
			//TODO: HTML schedule => JSON Array schedule
			$("#load .Content").each(function () {
				schedule.push(new Subject($(this)));
			});

			this.store.set({ schedule, duration });

			this.render.Schedule(schedule, duration);

			resolve({ success: true, data: schedule });
		});

		function Subject(data) {
			this.Thu = data.attr("title");
			this.Phong = getChild(data, 1).text();
			this.MonHoc = splitText(getChild(data, 3));
			this.TietHoc = splitText(getChild(data, 9), 1);
			this.GiaoVien = splitText(getChild(data, 11), 1);
		}

		function splitText(query, selectIndex = 0, reg = / \(|: /g) {
			return query.text().split(reg)[selectIndex] || "Không xác định";
		}
		function getValue(select) {
			return $("option:selected", select).val();
		}
		function checkNextWeek(curDate) {
			const date = new Date();
			curDate = curDate.split("/").reverse().join("-");
			return date - new Date(curDate) > 0;
		}
	}

	getScheduleById(id = "", week) {
		const regs =
			/-Môn: |-Lớp: |-Tiết: |-Phòng: |-GV: |-Đã học: |-Nội dung: |-Đã dạy: |-Mã LHP: |-Nội dung : |-Phòng :/i;
		const URL = [
			"/Home/DrawingStudentSchedule",
			"/Home/DrawingProfessorSchedule",
			"/Home/DrawingClassStudentSchedules_Mau2",
		];
		return new Promise(async (resolve, reject) => {
			if (id == "") reject({ success: false, msg: "⚠️ ID is Null." });
			extractData = extractData.bind(this);
			let f;
			try {
				if (!(await this.checkCookie())) return this.auth();

				let { year, term } = this.store.get();

				let p = {
						StudentId: id,
						YearId: year,
						TermId: term,
						WeekId: week,
						YearStudy: year,
						Week: week,
					},
					t = 0;
				if (id.length < 7) {
					p[isType(id)] = id;
					t = id.length == 5 ? 1 : 2;
				}

				await this.requestLoad({
					URI: { path: URL[t], query: p },
				});
				const r = [];

				const name = getText($("#load span")[1], ":")[1].trim(),
					d = $("#load tr:not(:first-child)");

				// ? Check user valid
				if (!name) {
					const msg =
						id.length == 5
							? "⚠️ Không Tồn Tại Giảng Viên Này...!"
							: "⚠️ Không Tồn Tại Sinh Viên Này...!";
					resolve({
						success: false,
						msg: msg,
					});
				}

				await d.each(async (i, e) => {
					const data = await extractData(i, e);
					r.push(...data);
				});
				resolve({
					success: true,
					data: r,
					name: name.replace("  ", " "),
				});
			} catch (error) {
				console.log("log" + error);
				if (!error.success) return reject(error);
			}
			async function extractData(index, e) {
				const render = this.render;
				let els = $(e).children(),
					res = [];

				els.each(function (j, el) {
					if (j == 0) return;

					if (id.length == 5) {
						if ($(el).children().length < 7) return;

						var s = $(el).html().trim().split("<hr>");

						for (var i = 0; i < s.length; i++) {
							var ex = s[i]
								.replace(/<br>/g, "")
								.replace("-&gt;", "-")
								.split(regs);
							res.push(
								new SubjectP(
									ex,
									render.dayOfWeek[index]
								)
							);
						}
					} else {
						$(el)
							.find("div")
							.each((i, e) =>
								res.push(
									new SubjectS(
										getText(e, regs),
										render.dayOfWeek[index]
									)
								)
							);
					}
				});
				return res;
			}

			function checkUpdate(day, id) {
				return day == 6 && id.length == 10;
			}

			function SubjectP(val, thu) {
				this.Thu = thu;
				this.MonHoc = val[1].split(" (")[0].replace("amp;", "");
				this.LHP = val[2];
				this.Lop = val[3];
				this.TietHoc = val[4];
				this.DaDay = val[5];
				this.Phong = val[6];
				this.NoiDung = val[7];
			}
			function SubjectS(val, thu) {
				this.Thu = thu;
				this.MonHoc = val[1].split("(")[0];
				this.Lop = val[2];
				this.TietHoc = val[3].replace("->", "-");
				this.Phong = val[4];
				this.GiaoVien = val[5];
				this.DaHoc = val[6];
				this.NoiDung = val[7];
			}
			function getText(el, reg) {
				return $(el).text().split(reg);
			}
			function isType(id) {
				return id.length == 5 ? "ProfessorID" : "ClassStudentID";
			}
		});
	}

	getMark() {
		return new Promise(async (resolve) => {
			const check = await this.checkCookie();
			if (!check) return this.auth(this.getMark);

			let { program } = this.store.get();

			if (!program) program = await this.getStudyProgramCode();
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
					if (
						$(sub[2]).text() != item.name ||
						$(sub[4]).attr("href") != item.survey
					)
						return item;
				});
				res.push(new Subject(sub));
			});
			this.render.Mark(res);
			resolve({ success: true, data: res });
		});

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

			this.detailCode =
				$("img", data[7])?.attr("onclick")?.split("'")[1] || "";
		}
	}

	getDetailMark(detail) {
		const listScore = [],
			select = "tbody>tr:not(:first)";
		return new Promise(async (resolve) => {
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

	survey(url) {
		const host = "esurvey.huflit.edu.vn",
			path = "/FrontEnd/VoteRatingTemplate/Vote.aspx/GetData";

		return new Promise(async (resolve) => {
			if (!url)
				return resolve({
					success: false,
					msg: "Không tìm thấy đường dẫn đánh giá",
				});
			const urlSearchParams = new URLSearchParams(
				url.split("aspx")[1]
			);
			const params = Object.fromEntries(urlSearchParams.entries());

			await this.requestServer({ URI: url });

			const data = await (
				await this.requestServer({
					URI: { host, path },
					form: {
						curClassId: params.classId,
						sid: params.SID,
						studyYearId: params.YearStudy,
						termId: params.TermID,
					},
					json: true,
				})
			).json();

			var res = await (
				await this.requestServer({
					URI: url.split("?")[0] + "/SendAnswer",
					form: {
						answerObject: rating(JSON.parse(data.d)),
						informationContent: "{}",
						captchaText: "",
						classId: params.classId,
						sid: params.SID,
					},
					json: true,
				})
			).json();

			if (res.d == "OK") resolve({ success: true, msg: res });
			else resolve({ success: false, msg: res });

			function rating(data) {
				let { RatingTemplates } = data;

				for (let parent in RatingTemplates) {
					var questions = RatingTemplates[parent].QuestionDTOs,
						answer = RatingTemplates[parent].AnswerDTOs;
					for (var i in questions) {
						if (answer.length) {
							questions[i] = checkAnswer(
								questions[i],
								answer[4].Id
							);
						} else questions[i].AnswerDTOs[0].TextAnswer = "";
					}
					RatingTemplates[parent].QuestionDTOs = questions;
				}
				data.RatingTemplates = RatingTemplates;

				return JSON.stringify(data);
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

	getExam() {
		return new Promise(async (resolve) => {
			// check login
			const check = await this.checkCookie();
			if (!check) return this.auth(this.getExam);

			const exams = [];

			const { year, term } = this.store.get();
			await this.requestLoad({
				URI: {
					path: "/Home/ShowExam",
					query: {
						YearStudy: year,
						TermID: term,
					},
				},
			});
			const $exams = $("#load>table>tbody>tr");

			if ($("#load table tbody tr td").text() != "Chưa có lịch thi")
				$exams.each(function () {
					const $exam = $(this);
					const name = getChild($exam, 2).text(),
						time = getChild($exam, 5).text(),
						date = getChild($exam, 4).text(),
						room = getChild($exam, 6).text(),
						duration = +getChild($exam, 7).text(),
						location = getChild($exam, 8).text();
					exams.push({
						name,
						time,
						date,
						room,
						duration,
						location,
					});
				});

			this.render.Exam(exams);
			resolve(exams);
		});
	}

	getStudyProgramCode() {
		return new Promise(async (resolve) => {
			await this.requestLoad({ URI: { path: "/Home/Marks" } });
			const program = $("#load #ddlStudyProgram>option").val();
			this.store.set({ program });
			resolve(program);
		});
	}

	getStudyProgram() {
		return new Promise(async (resolve, reject) => {
			try {
				let program = this.store.get("program");

				if (!(await this.checkCookie()))
					return this.auth(() => this.render.Setting());

				if (!program) program = await this.getStudyProgramCode();

				await this.requestLoad({
					URI: {
						path: "/API/Student/StudyPgrograms/" + program,
					},
				});

				const res = [];

				const programs = $("#load table tbody");

				programs.each((i, e) => {
					const el = $("tr", e);
					res.push(extractTerm(el));
				});

				resolve(res);
			} catch (error) {
				reject(error);
			}
		});
		function extractTerm(el) {
			const term = { name: "", data: [], totalCredit: 0 };

			el.each((i, e) => {
				if (i == 0) term.name = $(e).text();
				else if (i > 1) {
					if (e.children.length == 9)
						term.data.push(extractSubject($(e)));
					else term.totalCredit = +getChild($(e), 2).text();
				}
			});

			return term;
		}
		function extractSubject(sub) {
			return {
				id: getChild(sub, 2).text(),
				name: getChild(sub, 3).text(),
				credit: getChild(sub, 4).text(),
				theory: +getChild(sub, 5).text(),
				practical: +getChild(sub, 6).text(),
				faculty: getChild(sub, 9).text(),
			};
		}
	}

	getFinance() {
		const regs = {
				year: /\d{4}-\d{4}/g,
				term: /HK\d{2}/g,
				deadline: /\d{2}\/\d{2}\/\d{4}/g,
			},
			empty = [""];
		return new Promise(async (resolve) => {
			if (!(await this.checkCookie()))
				return this.auth(() => this.render.Setting());

			await this.requestLoad({
				URI: { path: "/Home/HienThiPhiHocPhan" },
			});

			const res = { total: 0, paid: 0, debt: 0, data: [] };

			const $thead = $("#load table thead:first-child");
			const $tr = $("#load table tbody tr");

			res.total = $("th:nth-child(2)", $thead).text();
			res.paid = $("th:nth-child(3)", $thead).text();
			res.debt = $("th:nth-child(6)", $thead).text();

			let temp = {
				year: "",
				term: "",
				deadline: "",
				fee: 0,
				paid: 0,
				debt: 0,
				data: [],
			};

			$tr.each((i, e) => {
				const $tds = $("td", e);
				if ($tds.length == 1) {
					const info = $tds.text().trim();
					[temp.year] = info.match(regs.year) || empty;
					[temp.term] = info.match(regs.term) || empty;
					[temp.deadline] = info.match(regs.deadline) || empty;
				} else if ($tds.length == 10) {
					const code = getChild($(e), 1).text(),
						name = getChild($(e), 2).text().split(" [")[0],
						fee = getChild($(e), 3).text(),
						paid = getChild($(e), 4).text(),
						debt = getChild($(e), 7).text(),
						paymentDate = getChild($(e), 8).text(),
						receipt = getChild($(e), 9).text();
					const correct = temp.data.findIndex(
						(e) => e.name == name
					);

					if (correct > -1 && temp.data[correct].fee == "0") {
						temp.data[correct] = {
							code,
							name,
							fee,
							paid,
							debt,
							paymentDate,
							receipt,
						};
					}
					if (correct == -1)
						temp.data.push({
							code,
							name,
							fee,
							paid,
							debt,
							paymentDate,
							receipt,
						});
				} else {
					temp.fee = getChild($(e), 2).text();
					temp.paid = getChild($(e), 3).text();
					temp.debt = getChild($(e), 6).text();

					res.data.push({ ...temp });
					temp.data = [];
				}
			});
			resolve(res);
		});
	}

	getWeeks() {
		return new Promise(async (resolve, reject) => {
			try {
				if (!(await this.checkCookie()))
					return this.auth(() => this.render.Setting());

				await this.requestLoad({
					URI: { path: "/Home/Schedules" },
				});

				const weeks = [];
				$("#load select#Week > option").each((i, e) =>
					weeks.push(e.value)
				);

				resolve(weeks);
			} catch (error) {
				reject([]);
			}
		});
	}

	getListProfessor() {
		return new Promise(async (resolve, reject) => {
			if (!(await this.checkCookie()))
				return this.auth(() => this.render.Setting());

			const body = await this.requestServer({
				URI: { path: "/Home/GetProfessorByTerm/2020-2021$HK02" },
			});
			var data = await body.json();
			data = data.map(({ ProfessorID: code, ProfessorName: n }) => {
				return `${code} - ${n
					.split(", ")[1]
					.split("  ")
					.join(" ")}`;
			});
			resolve(data);
		});
	}

	Logout() {
		this.store.clear();
		this.requestServer({ URI: { path: "/Login/Logout" } });
		document.location.href = "/popup.html";
	}
}
