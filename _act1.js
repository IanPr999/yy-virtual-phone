wxPane='msg'; go('call');
state.messages.length = 0;
pushMessage('me', '你到哪啦', 'text');
var vm = pushMessage('him', '我到楼下了，你慢慢来，不着急', 'voice', {dur:6});
var pm = pushMessage('him', '', 'pic', {cap:'刚看到的'});
fillHisPic(pm);
pushMessage('me', '好，我这就下去', 'text');
renderChat();
