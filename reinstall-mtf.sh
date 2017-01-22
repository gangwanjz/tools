#!/usr/bin/env bash

npmVersion=`npm -v`
if [ ${npmVersion:0:1} -lt 3 ] || [ ${npmVersion:3:1} == '.' ] ; then
    echo 'npm 版本过低，请升级至 3.10+' 1>&2
    exit 1
fi

absDir=`pwd -P`
if [ "${absDir/\/node_modules\/}" != "$absDir" ] ; then
    echo 'npm run mtf 只能用于更新顶层的依赖'
    exit 0
fi

ls node_modules | grep -e ^mtf\. | xargs npm install
