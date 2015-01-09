gulp = require 'gulp'

rename = require 'gulp-rename'
plumber = require 'gulp-plumber'
copy = require 'gulp-copy'
cached = require 'gulp-cached'
concat = require 'gulp-concat'

jsonlint = require 'gulp-jsonlint'
browserify = require 'gulp-browserify'
less = require 'gulp-less'

# Browserify
gulp.task 'akame_browserify', ->
    gulp.src ['Akame/app/js/background.ts', 'Akame/app/js/app.ts'], read: false
        .pipe browserify
            transform:  ['typescriptifier', 'debowerify'],
            extensions: ['.ts'],
        
        .pipe rename(extname: '.js')
        .pipe gulp.dest('bin/Akame/app/js/')
    
gulp.task 'kurome_browserify', ->
    gulp.src 'Kurome/background/js/background.ts', read: false
        .pipe browserify
            transform:  ['typescriptifier'],
            extensions: ['.ts'],
        
        .pipe rename(extname: '.js')
        .pipe gulp.dest('bin/Kurome/background/js/')

gulp.task 'json', ->
    gulp.src ['manifest.json', 'Akame/**/*.json', 'Kurome/**/*.json']
        .pipe cached('jsonlint')
        .pipe copy('bin')
   
    gulp.src ['*.json', 'Akame/**/*.json', 'Kurome/**/*.json']
        .pipe cached('jsonlint')
        .pipe jsonlint()
        .pipe jsonlint.reporter()
  

gulp.task 'html', ->
    gulp.src ['Akame/**/*.html']
        .pipe copy('bin')

gulp.task 'less', ->
    gulp.src ['Akame/app/css/app.less']
        .pipe less()
        .pipe gulp.dest('bin/Akame/app/css/app.css')

gulp.task 'bootstrap', ->
    gulp.src 'bower_components/bootstrap/dist/css/*.min.css'
        .pipe concat('bootstrap.css')
        .pipe gulp.dest('bin/Akame/app/css/')

gulp.task 'watch', ->
    gulp.watch 'Akame/**/*.ts', ['akame_browserify']
    gulp.watch 'Kurome/**/*.ts', ['kurome_browserify']
    
    gulp.watch ['Akame/**/*.json', 'Kurome/**/*.json'], ['json']
    gulp.watch ['Akame/**/*html'], ['html']
    
    gulp.watch 'bower_components/bootstrap', ['bootstrap']
    gulp.watch 'Akame/**/*.less', ['less']
    

gulp.task 'browserify', ['akame_browserify', 'kurome_browserify']
gulp.task 'default', ['json', 'browserify', 'html', 'bootstrap', 'less']