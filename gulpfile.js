'use strict';

const path = require('path');
const gulp = require('gulp');
const del = require('del');
const vfs = require('vinyl-fs');
const gutil = require('gulp-util');
const merge = require('merge-stream');
const babel = require('gulp-babel');
const sass = require('gulp-sass');
const reactPatcher = require('./gulp/gulp-react-patcher');

const dirs = [
	'chrome', 'components', 'defaults', 'resource', 'resource/web-library'
];

const files = [
	'chrome.manifest', 'install.rdf', 'update.rdf'
];

const jsGlob = `./\{${dirs.join(',')}\}/**/*.js`;

function onError(err) {
	gutil.log(gutil.colors.red('Error:'), err);
	this.emit('end');
}

function onSuccess(msg) {
	gutil.log(gutil.colors.green('Build:'), msg);
}

function getJS(source = jsGlob) { 
	return gulp.src(source, { base: '.' })
		.pipe(babel())
		.pipe(reactPatcher())
		.on('error', onError)
		.on('data', file => {
			onSuccess(`[js] ${path.basename(file.path)}`);
		})
		.pipe(gulp.dest('./build'));
}

// const debug = require('gulp-debug');

function getSymlinks() {
	const match = files.concat(dirs.map(d => `${d}/**`)).concat(['!**/*.js']);

	return gulp
		.src(match, { nodir: true, base: '.', read: false })
		.on('error', onError)
		.on('data', file => {
			onSuccess(`[ln] ${path.basename(file.path)}`);
		})
		.pipe(vfs.symlink('build/'));
}

function getSass() {
	return gulp
		.src('scss/*.scss')
		.on('error', onError)
		.pipe(sass())
		.pipe(gulp.dest('./build/chrome/skin/default/zotero/components/'));
}


gulp.task('clean', () => {
	return del('build');
});


gulp.task('symlink', ['clean'], () => {
	return getSymlinks();
});

gulp.task('js', () => {
	return getJS();
});

gulp.task('sass', () => {
	return getSass();
});

gulp.task('dev', ['clean'], () => {
	let watcher = gulp.watch(jsGlob);

	watcher.on('change', function(event) {
		getJS(event.path);
	});

	gulp.watch('src/styles/*.scss', ['sass']);

	return merge(
		getJS(),
		getSass(),
		getSymlinks()
	);
});

gulp.task('default', ['dev']);