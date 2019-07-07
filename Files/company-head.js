    code = '100000';
    sign = 'aa2144dc6c6e12e0';
    pageNum = 1; //页码
    limit = 10; //限制条数
    // http = 'http://api3.gxnw.cn';
    // http2 = 'http://www3.gxnw.cn';
    http = $('#httpVal').val();
    http2 = '';
    token = '';
    keyVal = ''
    startNum = 0; //起始数据条数
    localStartNum = 0; //本地存储的起始数据条数

    //  获取token
    function getToken(f1) {
        $.ajax({
            url: http + "/AccessToken/index?code=" + code,
            xhrFields: { withCredentials: true }, // 发送凭据
            type: "GET",
            dataType: "json",
            success: function(json) {
                token = json.data;
                if (typeof json.remainTime != 'undefined') {
                    if (json.remainTime && json.remainTime > 0) {
                        setTimeout(function() {
                            getToken()
                        }, Number(json.remainTime) * 1000)
                    }
                }
                if (f1) {
                    f1()
                }
            },
            error: function(json) {
                console.log('AccessToken发送失败');
            }
        })
    }
    $(function() {

		keyVal = GetQueryString('kw')
    	$('.search_headInput input').val(keyVal)
        // input提示信息兼容ie9-
        $('input, textarea').placeholder();
        // 列表tab切换
        $('.searchTab li').on('click', function() {
            if (keyVal != '') {
                $(this).addClass('active').siblings().removeClass('active');
                $('html , body').animate({ scrollTop: 0 });
                var tabIndex = $(this).index();
                if (tabIndex == 0) {
                    window.location.href = "/s/company?kw=" + encodeURIComponent(keyVal);
                } else if (tabIndex == 1) {
                    window.location.href = "/s/web?kw=" + encodeURIComponent(keyVal);
                } else {
                    window.location.href = "/s/product?kw=" + encodeURIComponent(keyVal);
                }
            } else {
                layer.msg("输入搜索关键词");
            }
        });

        // 搜索框回车事件
        $('.search_headInput input').on('keypress', function(event) {
            if (event.keyCode == 13) {
                keyVal = $('.search_headInput input').val().replace(/\ +/g, ""); //搜索框内容
                if (keyVal != '') {
                    var href = decodeURI(window.location.href)
                    href = changeURLPar(href, 'kw', keyVal);
                    window.location.href = href;
                } else {
                    layer.msg("输入搜索关键词");
                }
            }
        });
        // 点击搜索按钮
        $('.search_headInput button').on('click', function(event) {
            keyVal = $('.search_headInput input').val().replace(/\ +/g, ""); //搜索框内容
            if (keyVal != '') {
                var href = decodeURI(window.location.href)
                href = changeURLPar(href, 'kw', keyVal);
                window.location.href = href;
            } else {
                layer.msg("输入搜索关键词");
            }
        });


        // input变化
        $('.search_headInput input').bind('input propertychange', function() {
            keyVal = $('.search_headInput input').val()
        })


        // 企业列表对比-对勾
        $('body').on('click', '.searchComcheck,.myi', function() {
            var _that = this;
            var curr_company_id = this.getAttribute('key') ? this.getAttribute('key') : 0;
            curr_company_id = this.getAttribute('data-id') ? this.getAttribute('data-id') : curr_company_id;
            if ($(this).parent().hasClass('active') || $(this).hasClass('myi')) {
                // 删除对比
                annualURL = http2 + getContrastDelete;
                $.ajax({
                    url: annualURL,
                    xhrFields: { withCredentials: true }, // 发送凭据
                    type: "GET",
                    dataType: "json",
                    data: { "company_id": curr_company_id },
                    success: function(json) {
                        if (json.succ == 1) {
                            $(_that).parent().removeClass('active');
                            layer.msg("删除对比成功");
                            var myjson;
                            // 获取对比与关注的数据
                            $.ajax({
                                type: 'GET',
                                url: '/member/focusContrast',
                                dataType: "json",
                                xhrFields: { withCredentials: true }, // 发送凭据
                                contentType: "application/json",
                                success: function(json2) {
                                    myjson = json2.data.contrastCompany;
                                    setSidebarValue2(json2.data.focusCount, myjson)
                                },
                                error: function(XMLHttpRequest, textStatus, errorThrown) {
                                    layer.msg("获取错误！");
                                }
                            })
                        } else {
                            layer.msg("删除对比失败");
                        }
                    }
                })
            } else {
                // 添加对比
                annualURL = http2 + getContrast;
                $.ajax({
                    url: annualURL,
                    xhrFields: { withCredentials: true }, // 发送凭据
                    type: "GET",
                    dataType: "json",
                    data: { "company_id": curr_company_id },
                    success: function(json) {
                        if (json.succ == 1) {
                            $(_that).parent().addClass('active');
                            layer.msg("添加对比成功");
                            var myjson;
                            // 获取对比与关注的数据
                            $.ajax({
                                type: 'GET',
                                // url: '/member/focusContrast',
                                url: '/member/focusContrast',
                                dataType: "json",
                                xhrFields: { withCredentials: true }, // 发送凭据
                                contentType: "application/json",
                                success: function(json2) {
                                    myjson = json2.data.contrastCompany;
                                    setSidebarValue2(json2.data.focusCount, myjson)
                                },
                                error: function(XMLHttpRequest, textStatus, errorThrown) {
                                    layer.msg("获取错误！");
                                }
                            })
                        } else {
                            layer.msg(json.msg)
                        }
                    }
                })

            }

        });
    });