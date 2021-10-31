#!/bin/env node

require('dotenv').config();

const util = require('util');
const exec = util.promisify(require('child_process').exec);

(async function () {

  // Проверяем, что гит работает
	const gitError = (await exec('git --version')).stderr;
	if (gitError) {
		console.error('\x1b[31m', 'Error: Git isn\'t ok\n','\x1b[0m');
    console.error(gitError);
		return;
	}

  // Получаем последние два тега.
	const lastTwoTags = (await exec('git tag | tail --lines=2')).stdout;
	const [currentTag, prevTag] = lastTwoTags.split(/\r?\n/).reverse();

  // Выбрасываем ошибку если не найдено ни одного тега
	if (!prevTag) {
		console.error('\x1b[31m', 'Error: No tags specified\n','\x1b[0m');
    return;
	}

  // Получаем хэши коммитов тегов
	const getHashByTag = async function (tag) {
		return (await exec(`git rev-parse '${tag}'`)).stdout;
	}
  const prevTagHash = await getHashByTag(prevTag);
  const currentTagHash = currentTag ? await getHashByTag(currentTag) : null;

  // Получаем данные коммитов по шаблону
	const getCommitInfo = async function (format, onlyLast) {
    const command = `git log --pretty=format:'${format}' ${onlyLast ? '--max-count=1' : ''} ${!currentTag ? '--reverse' : ''} ${prevTagHash}${currentTag ? '...'+currentTagHash : ''}`;
		return (await exec(command)).stdout;
	}

  // Готовим данные для релизного тикета
	const history = await getCommitInfo('%h %s');
	const author = await getCommitInfo('%aN <%aE>', true);
	const date = await getCommitInfo('%ad', true);
  // const tests = (await exec('./runTests.js')).stdout;

	const ticketBody = {
		author,
		date,
		history,
    // tests,
	};

	console.log(ticketBody);

})();
