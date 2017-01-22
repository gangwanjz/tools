#!/usr/bin/env bash

# 发生错误后立即停止
trap 'echo "发生了异常，请检查输出。" >&2; exit' ERR

remote="$1"
branch="$2"
message="$3"
if [ -z "$remote" ] || [ -z "$branch" ]; then
    echo "release.sh <remote> <branch>"
    exit
fi

function echonv() {
    echo -n "$1"
    echo -e "\033[32m$2\033[0m"
}
echonv "项目：" "$PWD"
echonv "远程：" "$remote"
echonv "分支：" "$branch"

localBranch=`git rev-parse --abbrev-ref HEAD`
if [ ${localBranch:0:6} != "master" ]; then
    echo -e "\033[1;33m警告：当前项目不在 master 前缀的分支上，请确认是否要在这里发版\033[0m"
fi

if [ -z "$message" ]; then
    echo -n "请输入提交信息："
    read message
else
    echonv "提交信息：" "$message"
fi

# 构建
absDir=`pwd -P`
if [ "${absDir/\/node_modules\/}" == "$absDir" ] ; then
    npm run mtf  # 只在顶层项目里更新依赖
fi
rm -rf dev/build
npm run build

# 克隆目标仓库
rm -rf dev/.release
git clone --depth 1 "$remote" dev/.release
cd dev/.release

# 检出目标分支，如果不存在则创建
if [ -n "`git ls-remote -q | grep -e "/${branch}$"`" ]; then
    git fetch --depth 1 --update-head-ok origin "$branch":"$branch"
    git checkout "$branch"
else
    git checkout --orphan "$branch"
fi

# 暂存新版本
(GLOBIGNORE='.git'; rm -rf *)
mv -v ../build/* .
rm -rf ../build
git add -A

# 提交并推送
git commit -m "$message (auto-release)"
git push origin "$branch"
rm -rf ../.release
