#!/bin/env node

require('dotenv').config();

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios').default;

axios.defaults.baseURL = 'https://api.tracker.yandex.net';
axios.defaults.headers.common['Authorization'] = `OAuth ${process.env.OAUTH_TOKEN}`;
axios.defaults.headers.common['X-Org-ID'] = `${process.env.ORG_ID}`;

let currentTag;
let prevTag;
let prevTagHash;
let currentTagHash;

async function findTicket(tag) {
	const { data: list } = await axios({
		url: '/v2/issues/_search',
		method: 'POST',
		data: {
			filter: {
				'unique': `${process.env.ORG_ID}_${tag}`
			}
		}
	});

	if (!list.length) return false;

	return list[0];
}

async function createTicket(tag) {
	await axios({
		url: '/v2/issues/',
		method: 'POST',
		data: await generateTicketData(tag),
	});

}

async function updateTicket(key, tag) {
	await axios({
		url: `/v2/issues/${key}`,
		method: 'PATCH',
		data: await generateTicketData(tag),
	});
}

async function generateTicketData(tag) {
	const date = new Date(Date.now()).toLocaleDateString("ru-RU");
	const author = await getCommitInfo('%aN <%aE>', true);
	const changelog = await getCommitInfo('%h %s');
	const tests = 'tests result'; //(await exec('./runTests.js')).stdout;

	const description = `Автор: ${author}\nДата релиза: ${date}\nВерсия: ${tag}\n\nChangelog:\n${changelog}\n\nРезультат тестов:\n${tests}`;

	return{
		summary: `Release ${tag} EDITED`,
		description,
		queue: 'TMP',
		unique: `${process.env.ORG_ID}_${tag}`,
	};
}

async function checkGit() {
	const gitError = (await exec('git --version')).stderr;
	if (gitError) {
		console.error('Error: Git not available');
    console.error(gitError);
		return false;
	}
	return true;
}

async function getLastTwoTags() {
	const gitTagOutput = (await exec('git tag')).stdout;
	const tags = gitTagOutput.split(/\r?\n/);
	if (!tags[0]) {
		console.error('Error: No tags specified');
		return null;
	}
	return [tags[1], tags[0]];
}

async function getHashByTag(tag) {
	return (await exec(`git rev-parse '${tag}'`)).stdout.trim('\n');
}

async function getCommitInfo(format, onlyLast) {
	const command = `git log --pretty=format:'${format}' ${onlyLast ? '--max-count=1' : ''} ${!currentTag ? '--reverse' : ''} ${prevTagHash}${currentTag ? '...'+currentTagHash : ''}`;
	return (await exec(command)).stdout;
}

async function release() {
	if (!checkGit) return;

	[currentTag, prevTag] = await getLastTwoTags();
	
	prevTagHash = await getHashByTag(prevTag);
	currentTagHash = currentTag ? await getHashByTag(currentTag) : null;

	const existingTask = await findTicket(currentTag);

	if (existingTask) {
		await updateTicket(existingTask.key, currentTag);
	} else {
		await createTicket(currentTag)
	}
}

release();