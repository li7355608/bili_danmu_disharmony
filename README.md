# bili_danmu_disharmony
直播弹幕反诈，不会显示没发出去的弹幕，且在浏览器弹出自定义高亮弹幕提示被什么删除。
本项目直装脚本页面：https://greasyfork.org/zh-CN/scripts/516801-哔哩哔哩直播弹幕反诈修改版
# 弹幕反诈脚本

这是一个用于拦截和处理发送到 Bilibili 直播间的弹幕请求的脚本。它可以检测弹幕发送失败的情况，并在屏幕上显示相应的提示信息。
脚本修改自 TGSAN-哔哩哔哩直播弹幕反诈 ，增添了主播屏蔽弹幕发送失败时的相关信息提示。
https://greasyfork.org/zh-CN/scripts/488621-哔哩哔哩直播弹幕反诈。

## 功能

- 拦截发送到 `api.live.bilibili.com/msg/send` 的请求。
- 根据服务器返回的信息，判断弹幕是否发送失败。
- 在弹幕发送失败时，在屏幕上显示提示信息（**仅在全屏模式生效**）。
- 弹幕从左侧固定位置开始向右滚动，被**主播**吃掉为**蓝色**，被**系统**吃掉为**绿色**。
- **系统权限高于主播**，当出现美味小零食时**系统会优先吃掉小零食**。

## 效果展示
- 被系统吃掉
- ![image](https://github.com/user-attachments/assets/c89ed114-d547-4d00-acc4-19cdfcff5856)
- 被主播吃掉
- ![image](https://github.com/user-attachments/assets/a5021dd9-e6b9-4b48-af44-510f03be1134)
- 全屏情况下显示效果
- ![image](https://github.com/user-attachments/assets/f970511a-3d1a-4acf-9522-5d8c139663ec)


## 使用方法

1. 确保您使用的是支持用户脚本的浏览器扩展（如 Tampermonkey 或 Greasemonkey）。
2. 将脚本添加到您的用户脚本管理器中。
3. 访问 Bilibili 直播间，脚本将自动运行。

## 代码说明

- **窗口上下文**: 检测是否可以使用 `unsafeWindow` 来访问页面的 `window` 对象。
- **拦截请求**: 重写 `fetch` 函数以拦截特定的请求。
- **显示信息**: 使用固定位置的 `div` 元素在屏幕上显示消息，并通过 `requestAnimationFrame` 实现从左到右的滚动效果。

## 自定义

- **滚动速度**: 可以通过调整 `showFloatingMessage` 函数中的 `speed` 变量来改变弹幕滚动速度。
- **消息内容和颜色**: 在 `showFloatingMessage` 函数中修改 `message` 和 `color` 参数以自定义显示内容。

## 注意事项

- 本脚本仅用于学习目的，请勿用于非法用途。
- 使用本脚本可能会违反某些网站的使用条款，请谨慎使用。

## 贡献

欢迎提交问题和建议！如果您有改进的想法，请随时提 PR 或 issue。

## 许可证

本项目采用 GPL 3.0 许可证。详细信息请参阅 LICENSE 文件。
