async function loadHtml(res, query = "") {
	const html = removeScriptAndImage(await res.text());

	$("#load" + query).html(html);
}

function removeScriptAndImage(text) {
	const regRemove = /src=(.*?)"|<script(.*?)>|<link(.*?)>|style="(.*?)"/g;
	return text.replaceAll(regRemove, "");
}

function makeURL({ host, path, query }) {
	let queryStr = new URLSearchParams(query).toString();
	return `https://${host + path}${!queryStr.length ? "" : "?" + queryStr}`;
}

function getChild(data, i) {
	return data.children(`:nth-child(${i})`);
}

function delay(ms = 50) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
