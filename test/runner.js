/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-underscore-dangle */
const path = require('path');
const { expect } = require('chai');
const fs = require('fs-extra');
const runner = require('../lib/runner.js');

const dest = 'test/testdir';

const options = {
	cwd: '/',

	dist: {
		src: 'test/src',
		dest: 'test/dest',
		baseurl: 'baseurl'
	},
	serve: {
		port: 9000,
		open: true,
		path: '/'
	},
	flags: {
		overwrite: true
	}
};
options.dist.fullPathToSource = options.dist.src;
options.dist.fullPathToDest = path.resolve(options.cwd, options.dist.dest, options.dist.baseurl);

// TESTOP IS NEVER CHANGED
const testOp = {
	cwd: '/',

	dist: {
		src: 'test/src',
		dest: 'test/dest',
		baseurl: 'baseurl'
	},
	serve: {
		port: 9000,
		open: true,
		path: '/'
	},
	flags: {
		overwrite: true
	}
};
testOp.dist.fullPathToSource = testOp.dist.src;
testOp.dist.fullPathToDest = path.resolve(testOp.dist.dest, 'baseurl');

describe('_fetchFiles', function () {
	before(function () {
		fs.mkdirSync('test/forTesting');
		fs.mkdirSync('test/forTesting/assets');
		fs.mkdirSync('test/forTesting/css');
		fs.mkdirSync('test/forTesting/html');
		fs.mkdirSync('test/forTesting/emptyDir/emptierDir', { recursive: true });
		fs.writeFileSync('test/forTesting/image.jpg', 'image');
		fs.writeFileSync('test/forTesting/assets/image2.jpg', 'image');
		fs.writeFileSync('test/forTesting/style.css', 'css');
		fs.writeFileSync('test/forTesting/css/style2.css', 'css');
		fs.writeFileSync('test/forTesting/index.html', 'html');
		fs.writeFileSync('test/forTesting/html/index2.html', 'html');
	});

	context('type = any', function () {
		it('should retrieve all files', async function () {
			const results = await runner._fetchFiles('test/forTesting', 'any');
			expect(results.css.length).to.equal(2);
			expect(results.other.length).to.equal(2);
			expect(results.html.length).to.equal(2);
		});
	});
	context('type = css', function () {
		it('should retrieve all css files', async function () {
			const results = await runner._fetchFiles('test/forTesting', 'css');
			expect(results.css.length).to.equal(2);
			expect(results.html.length).to.equal(0);
			expect(results.other.length).to.equal(0);
			expect(results.css.every((file) => path.extname(file) === '.css')).to.equal(true);
		});
	});

	context('type = html', function () {
		it('should retrieve all html files', async function () {
			const results = await runner._fetchFiles('test/forTesting', 'html');
			expect(results.html.length).to.equal(2);
			expect(results.css.length).to.equal(0);
			expect(results.other.length).to.equal(0);
			expect(results.html.every((file) => path.extname(file) === '.html')).to.equal(true);
		});
	});

	context('type = assets', function () {
		it('should retrieve all files', async function () {
			const results = await runner._fetchFiles('test/forTesting', 'assets');
			expect(results.other.length).to.equal(2);
			expect(results.css.length).to.equal(0);
			expect(results.html.length).to.equal(0);
			expect(results.other.every((file) => path.extname(file) === '.jpg')).to.equal(true);
		});
	});

	context('partitions', function () {
		const getPartitionFiles = (partition) => (
			Object.keys(partition).reduce((acc, type) => [...acc, ...partition[type]], []).sort()
		);

		before(async function () {
			this.defaultPartition = await runner._fetchFiles('test/forTesting', 'any');
			this.partition1 = await runner._fetchFiles('test/forTesting', 'any', { split: 2, partition: 1 });
			this.partition2 = await runner._fetchFiles('test/forTesting', 'any', { split: 2, partition: 2 });
		});

		it('prevents invalid `split` or `partition` value', async function () {
			const partition = await runner._fetchFiles('test/forTesting', 'any', { split: 0, partition: 0 });
			const files = getPartitionFiles(partition);

			expect(files.length).to.equal(6);
		});

		it('prevents undefined `split` or `partition` value', async function () {
			const partition = await runner._fetchFiles('test/forTesting', 'any', { split: undefined, partition: undefined });
			const files = getPartitionFiles(partition);

			expect(files.length).to.equal(6);
		});

		it('ensured `partition` is not greater than `split`', async function () {
			const partition = await runner._fetchFiles('test/forTesting', 'any', { split: 1, partition: 2 });
			const files = getPartitionFiles(partition);

			expect(files.length).to.equal(6);
		});

		it('should match default behaviour', async function () {
			const defaultPartitionFiles = getPartitionFiles(this.defaultPartition);
			const partition1Files = getPartitionFiles(this.partition1);
			const partition2Files = getPartitionFiles(this.partition2);

			expect(defaultPartitionFiles).to.eql([...partition1Files, ...partition2Files]);
		});

		it('should create partitions', async function () {
			const partition1Files = getPartitionFiles(this.partition1);
			const partition2Files = getPartitionFiles(this.partition2);

			expect(partition1Files.length).to.equal(3);
			expect(partition2Files.length).to.equal(3);
		});

		it('should not have duplicate files', async function () {
			const partition1Files = getPartitionFiles(this.partition1);
			const partition2Files = getPartitionFiles(this.partition2);
			const duplicateFiles = partition1Files.filter((value) => partition2Files.includes(value));

			expect(duplicateFiles).to.eql([]);
		});
	});

	context('dir doesnt exist', function () {
		it('should throw an error', async function () {
			const results = await runner._fetchFiles('test/fakeDir');
			expect(results).to.equal(undefined);
			// expect(await function() {runner._fetchFiles('test/fakeDir')}).to.throw();
		});
	});

	after(function () {
		fs.remove('test/forTesting');
	});
});

describe('_copyFiles', function () {
	before(function () {
		fs.mkdirSync('test/src');
		fs.mkdirSync('test/src/assets');
		fs.mkdirSync('test/src/css');
		fs.mkdirSync('test/src/html');
		fs.writeFileSync('test/src/image.jpg', 'image');
		fs.writeFileSync('test/src/assets/image2.jpg', 'image');
		fs.writeFileSync('test/src/style.css', 'css');
		fs.writeFileSync('test/src/css/style2.css', 'css');
		fs.writeFileSync('test/src/index.html', 'html');
		fs.writeFileSync('test/src/html/index2.html', 'html');
	});

	context('copy files from src to dest', function () {
		it('should return the copied files', async function () {
			const fileList = ['test/src/image.jpg', 'test/src/assets/image2.jpg', 'test/src/style.css',
				'test/src/css/style2.css', 'test/src/index.html', 'test/src/html/index2.html'];
			const results = await runner._copyFiles(fileList, testOp);
			expect(results.length).to.equal(6);
		});
	});

	after(function () {
		fs.removeSync('test/dest');
		fs.removeSync('test/src');
	});
});

describe('_askYesNo', function () {
	context('Response is affirmative', function () {
		it('should return true', async function () {
			const response = await runner._askYesNo('question', 'Y');
			expect(response).to.equal(true);
		});
	});

	context('Response is negative', function () {
		it('should return false', async function () {
			const response = await runner._askYesNo('question', 'N');
			expect(response).to.equal(false);
		});
	});
});

describe('build', function () {
	before(function () {
		fs.mkdirSync('test/src');
		fs.mkdirSync('test/src/assets');
		fs.mkdirSync('test/src/css');
		fs.mkdirSync('test/src/html');
		fs.writeFileSync('test/src/image.jpg', 'image');
		fs.writeFileSync('test/src/assets/image2.jpg', 'image');
		fs.writeFileSync('test/src/style.css', 'css');
		fs.writeFileSync('test/src/css/style2.css', 'css');
		fs.writeFileSync('test/src/index.html', 'html');
		fs.writeFileSync('test/src/html/index2.html', 'html');
	});

	context('building a valid filesystem', function () {
		it.skip('should return 0', async function () {
			// const res = await runner.build(testOp);
		});
	});

	after(function () {
		fs.removeSync('test/dest');
		fs.removeSync('test/src');
	});
});

describe('clean', async function () {
	before(function () {
		fs.mkdirSync(dest);
	});

	await context('Removing a file', function () {
		it('should remove the directory', async function () {
			options.dist.dest = dest;
			const res = await runner.clean(options);
			expect(res).to.eql([path.resolve(options.dist.dest)]);
		});
	});

	await context('invalid directory name', function () {
		options.dist.dest = 'thisdoesntexist';
		it('should return an empty array', async function () {
			const res = await runner.clean(options);
			expect(res).to.eql([]);
		});
	});

	after(function () {
		fs.removeSync('test/testdir', { recursive: true });
	});
});

describe('clone-assets', function () {
	before(function () {
		fs.mkdirSync('test/src');
		fs.mkdirSync('test/src/assets');
		fs.writeFileSync('test/src/image.jpg', 'image');
		fs.writeFileSync('test/src/assets/image2.jpg', 'image');
	});

	context('Cloning from a valid directory', function () {
		it('should return the cloned files', async function () {
			const results = await runner.clone_assets(testOp);
			expect(results.length).to.equal(2);
		});
	});

	context('Cloning from invalid directory', function () {
		it('should return undefined', async function () {
			options.dist.src = 'thisdoesntexist';
			const results = await runner.clone_assets(options);
			expect(results).to.equal(1);
		});
	});

	after(function () {
		fs.removeSync('test/dest');
		fs.removeSync('test/src');
	});
});

describe('dist', function () {

});

describe('rewrite-css', function () {
	before(function () {
		fs.mkdirSync('test/src');
		fs.mkdirSync('test/src/css');
		fs.writeFileSync('test/src/style.css', 'css');
		fs.writeFileSync('test/src/css/style2.css', 'css');
	});

	context('Cloning from a valid directory', function () {
		it('should return the cloned files', async function () {
			const results = await runner.rewrite_css(testOp);
			expect(results).to.equal(0);
		});
	});

	context('Cloning from invalid directory', function () {
		it('should return undefined', async function () {
			options.dist.src = 'thisdoesntexist';
			const results = await runner.rewrite_css(options);
			expect(results).to.equal(1);
		});
	});

	context('trying to copy files that dont exist', function () {
		it('should return 1', async function () {
			options.dist.fullPathToSource = 'fake';
			const results = await runner.rewrite_css(options);
			expect(results).to.equal(1);
		});
	});

	after(function () {
		fs.removeSync('test/dest');
		fs.removeSync('test/src');
	});
});

describe('rewrite-html', function () {
	before(function () {
		fs.mkdirSync('test/src');
		fs.mkdirSync('test/src/html');
		fs.writeFileSync('test/src/index.html', 'html');
		fs.writeFileSync('test/src/html/index2.html', 'html');
	});

	context('Cloning from a valid directory', function () {
		it('should return the cloned files', async function () {
			const results = await runner.rewrite_html(testOp);
			expect(results).to.equal(0);
		});
	});

	context('Cloning from invalid directory', function () {
		it('should return undefined', async function () {
			options.dist.src = 'thisdoesntexist';
			const results = await runner.rewrite_html(options);
			expect(results).to.equal(1);
		});
	});

	context('trying to copy files that dont exist', function () {
		it('should return 1', async function () {
			options.dist.fullPathToSource = 'fake';
			const results = await runner.rewrite_html(options);
			expect(results).to.equal(1);
		});
	});

	after(function () {
		fs.removeSync('test/dest');
		fs.removeSync('test/src');
	});
});

describe('serve', function () {

});

describe('watch', function () {

});
