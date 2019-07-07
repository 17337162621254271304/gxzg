;
$(function() {
	
    $('.comTxt div').html('<button class="comBtn">展开更多<i></i></button>');

    getToken(function() {
        // 初始化渲染
        getCom();
        getRAdv();
        getAdvfunc()
        getRecentBro();
    })

    // $.ajax({
    //     url: http + "/AccessToken/index?code=" + code,
    //     xhrFields: { withCredentials: true }, // 发送凭据
    //     // async: false,
    //     type: "GET",
    //     dataType: "json",
    //     success: function(json) {
    //         if (json.success == true) {
    //             token = json.data;
    //             // 初始化渲染
    //             getCom();
    //             getRAdv();
    //             getAdvfunc()
    //             getRecentBro();
    //             if (typeof json.remainTime != 'undefined') {
    //                 if (json.remainTime && json.remainTime > 0) {
    //                     setInterval(function() {
    //                         getToken()
    //                     }, Number(json.remainTime) * 1000)
    //                 }
    //             }
    //         } else {
    //             console.log('AccessToken获取错误');
    //         }
    //     },
    //     error: function(json) {
    //         console.log('AccessToken发送失败');
    //     }
    // })



    //给弹出层绑定点击事件，阻止冒泡
    $(".comDiv").bind("click", function() {
        preventBubble();
        // window.event ? window.event.cancelBubble = true : e.stopPropagation();
    })

    // 企业名片弹框关闭-×
    $('.closeComModal').on('click', function() {
        $('.comModal').css('display', 'none');
        $('.comDiv .comTxt div').css('height', '66px').css('overflow', 'hidden');
        $('.comBtn').css('display', 'block');
    });

    // 企业名片弹框关闭-背景部分
    $('.comModal').on('click', function() {
        $('.comModal').css('display', 'none');
        $('.comDiv .comTxt div').css('height', '66px').css('overflow', 'hidden');
        $('.comBtn').css('display', 'block');
    });
    //给弹出层绑定点击事件，阻止冒泡2
    $(".dbuybody").bind("click", function(e) {
        preventBubble();
        // window.event ? window.event.cancelBubble = true : e.stopPropagation();
    })

    function preventBubble(event) {
        var e = arguments.callee.caller.arguments[0] || event; //若省略此句，下面的e改为event，IE运行可以，但是其他浏览器就不兼容
        if (e && e.stopPropagation) {
            e.stopPropagation();
        } else if (window.event) {
            window.event.cancelBubble = true;
        }
    }

    // 获取企业列表-对比的要单独再获取一次接口(因为公信.中国不能跟api接口不同域名，无法共享session)
    function getCom(curr) {
        $('.loading').show();
        pageNum = curr || pageNum;
        //请求参数
        var annualdata = '{"keyword":"' + keyVal + '","page":' + pageNum + ',"limit":' + limit + '}';
        annualURL = http + getcomApi;
        annualdataEncrypted = encrypt(annualdata, code, sign);
        $.ajax({
            url: annualURL,
            xhrFields: { withCredentials: true }, // 发送凭据
            type: "GET",
            dataType: "json",
            data: { "code": code, "param": annualdataEncrypted, "token": token },
            success: function(json) {
                //获取对比公司
                $.ajax({
                    url: '/member/focusContrast',
                    xhrFields: { withCredentials: true }, // 发送凭据
                    type: "GET",
                    dataType: "json",
                    success: function(json2) {
                        var contrastCompany = json2.data && json2.data.contrastCompany ? json2.data.contrastCompany : [];
                        $('.loading').hide();
                        if (json.data && json.data.jumpUrl && json.data.jumpUrl) {
                            location = json.data.jumpUrl;
                        } else if (json.data.list && json.data.list.length > 0) {
                        	
                            for (var i = 0; i < json.data.list.length; i++) {
                                var companyName2 = repalceKeyword(keyVal, json.data.list[i].companyName, { element: 'em', className: 'kwordRed' });
                                json.data.list[i].companyName2 = companyName2;
                                json.data.list[i].creditCode = repalceKeyword(keyVal, json.data.list[i].creditCode, { element: 'em', className: 'kwordRed' });
                                if (json.data.list[i].attestation && json.data.list[i].attestation != '') {
                                    json.data.list[i].attestation = json.data.list[i].attestation.split(",");
                                }
								
								json.data.list[i].webSite2 = repalceKeyword(keyVal, json.data.list[i].webSite, { element: 'em', className: 'kwordRed' })
                                json.data.list[i]['isContrast'] = isContrast;
                                //添加是否对比字段
                                var isContrast = 0;
                                for (var j = 0; j < contrastCompany.length; j++) {
                                    if (contrastCompany[j]['company_id'] == json.data.list[i]['id']) {
                                        isContrast = 1;
                                    }
                                }
                                
                            }
                            var searchInfo = keyVal;
                            json.data.searchInfo = searchInfo;
                            var pages = Math.ceil(json.data.count / limit); //得到总页数
                            // 调用分页
                            laypage({
                                cont: 'searchComPage',
                                pages: pages,
                                curr: pageNum,
                                jump: function(obj, first) {
                                    if (!first) { //点击跳页触发函数自身，并传递当前页：obj.curr
                                        getCom(obj.curr);
                                        $('html , body').animate({ scrollTop: 0 });
                                    }
                                }
                            })
                            var html = template("companyDiv", json.data);

                            document.getElementById("searchCompany").innerHTML = html;

                        } else {
                            $('.searchCompanyLine').css('display', 'none');
                            $('#searchComPage').css('display', 'none');
                            $('.searchDiv .search_no_msg').css('display', 'block');

                        }

                    }
                });
            }
        });
    }

    // 企业点击时
    // 企业名片弹框展示
    $('body').on('click', '.comP', function() {
        var that = this;
        var urltxt = this.getAttribute('id');
        var annualdata = '{"companyId":"' + this.getAttribute('key') + '"}';
        annualURL = http + getBusinessCard;
        annualdataEncrypted = encrypt(annualdata, code, sign);
        $.ajax({
            url: annualURL,
            xhrFields: { withCredentials: true }, // 发送凭据
            type: "GET",
            dataType: "json",
            data: { "code": code, "param": annualdataEncrypted, "token": token },
            success: function(json) {
                if (json.success) {
                    $('.comRight h6').text(json.data.companyName);
                    $('.comModal .urltxt').text(urltxt);
                    $('.comModal .phonetxt').text(json.data.phone);
                    $('.comModal .emailtxt').text(json.data.email);
                    $('.comModal .addrtxt').text(json.data.address);
                    $('.comModal .addrtxt').attr("title", json.data.address);
                    $('.comModal .comLeftImg img').attr('src', that.getAttribute('imgSrc'));
                    if (json.data.comIntroduction && json.data.comIntroduction.length > 0) {
                        $('.comTxt div').html(json.data.comIntroduction + '<button class="comBtn">展开更多<i></i></button>');
                    } else {
                        $('.comTxt div').html('暂无内容');
                    }
                    if (json.data.mainBusiness.length && json.data.mainBusiness.length > 0) {
                        var str = [];
                        for (var i = 0; i < json.data.mainBusiness.length; i++) {
                            str += '<li>' + json.data.mainBusiness[i] + '</li>';
                        }
                        $('.comDiv .comfoot div ul').html(str)
                    } else {
                        $('.comDiv .comfoot div ul').html('暂无内容');
                    }
                    $('.comModal').css('display', 'block');
                    $(".comTxt").on('click', '.comBtn', function() {
                        preventBubble();
                        $(this).parent().css('height', '110px').css('overflow-y', 'scroll');
                        $(this).css('display', 'none');
                    });
                } else {
                    layer.msg(json.msg)
                }

            },
            error: function(json) {

            }
        })

    });
    // 最近浏览记录获取
    function getRecentBro() {
        var type = 1;
        var annualdata = '{"type":' + type + ',"limit":' + limit + '}';
        annualURL = http + getRecentBrowse;
        annualdataEncrypted = encrypt(annualdata, code, sign);
        $.ajax({
            url: annualURL,
            xhrFields: { withCredentials: true }, // 发送凭据
            type: "GET",
            dataType: "json",
            data: { "code": code, "param": annualdataEncrypted, "token": token },
            success: function(json) {
                var alist = {
                    data: { list: [] }
                };
                if (json.data.list && json.data.list.length > 0) {
                    alist.data.list = json.data.list.slice(0, 5);
                    if (type == 1) {
                        var html = template("comRecent", alist.data);
                        document.getElementById("searchRLook_com").innerHTML = html;
                    } else if (type == 2) {
                        var html = template("webRecent", alist.data);
                        document.getElementById("searchRLook_web").innerHTML = html;
                    } else {
                        var html = template("shopRecent", alist.data);
                        document.getElementById("searchRLook_shop").innerHTML = html;
                    }
                } else {
                    if (type == 1) {
                        var html = template("comRecent", alist.data);
                        document.getElementById("searchRLook_com").innerHTML = html;
                    } else if (type == 2) {
                        var html = template("webRecent", alist.data);
                        document.getElementById("searchRLook_web").innerHTML = html;
                    } else {
                        var html = template("shopRecent", alist.data);
                        document.getElementById("searchRLook_shop").innerHTML = html;
                    }
                }

            },
            error: function(json) {

            }
        })
    }
    // 企业-保存浏览记录
    $('body').on('click', '.recorda', function() {
        var companyId = this.getAttribute('key'); //公司id 
        saveRecentBrowser(1, companyId)
    });


    function saveRecentBrowser(a1, a2, a3) {
        var type = a1,
            companyId = a2,
            officialUrl = a3;
        var annualdata;
        if (type == 1) {
            annualdata = '{"type":' + type + ',"companyId":"' + companyId + '"}';
        } else {
            annualdata = '{"type":' + type + ',"companyId":' + companyId + ',"officialUrl":"' + officialUrl + '"}';
        }
        annualURL = http + saveRecentBrowse;
        annualdataEncrypted = encrypt(annualdata, code, sign);
        $.ajax({
            url: annualURL,
            xhrFields: { withCredentials: true }, // 发送凭据
            type: "GET",
            dataType: "json",
            data: { "code": code, "param": annualdataEncrypted, "token": token },
            success: function(json) {
                // console.log(json)
            },
            error: function(json) {

            }
        });
    }

    function getAdvfunc() {
        // 找到的网站
        var annualdata = '{"keyword":"' + keyVal + '","page":1,"limit":"5"}';
        annualURL = http + getwebApi;
        annualdataEncrypted = encrypt(annualdata, code, sign);
        $.ajax({
                url: annualURL,
                xhrFields: { withCredentials: true }, // 发送凭据
                type: "GET",
                dataType: "json",
                data: { "code": code, "param": annualdataEncrypted, "token": token },
                success: function(json) {
                    var myjson = { data: { list: [] } }
                        // if (json.data.keyword != []) {
                        //     myjson.data.keyword = json.data.keyword;
                        //     myjson.data.list = json.data.list.slice(0, 4);
                        // } else {
                        //     myjson.data.list = json.data.list.slice(0, 5);
                        // }
                    if (json.data.list && json.data.list.length > 0) {
                        myjson.data.list = json.data.list.slice(0, 5);
                    }
                    var htmlFind = template("webFind", myjson.data);
                    document.getElementById("searchRightFindWeb1").innerHTML = htmlFind;
                }
            })
            // 找到的产品
        var myjson4 = { data: { list: [] } }
            // 关键词【第一条】
        var annualdata1 = '{"keyword":"' + keyVal + '"' + '}';
        var annualURLshop1 = http + getZgAd;
        var annualdataEncryptedshop1 = encrypt(annualdata1, code, sign);
        $.ajax({
                url: annualURLshop1,
                xhrFields: { withCredentials: true }, // 发送凭据
                type: "GET",
                async: false,
                dataType: "json",
                data: { "code": code, "param": annualdataEncryptedshop1, "token": token },
                success: function(json) {
                    if (json.success) {
                        myjson4.data.keyword = json.data;
                        if (myjson4.data.keyword.imgUrl.indexOf(",") > -1) {
                            myjson4.data.keyword.img = myjson4.data.keyword.imgUrl.split(",")[0];
                        } else {
                            myjson4.data.keyword.img = myjson4.data.keyword.imgUrl;
                        }
                    }
                }
            })
            // 后四条
        var annualdata2 = '{"keyword":"' + keyVal + '","pageNum":1}';
        annualURL2 = http + getshopApi;
        annualdataEncrypted2 = encrypt(annualdata2, code, sign);
        $.ajax({
            url: annualURL2,
            xhrFields: { withCredentials: true }, // 发送凭据
            type: "GET",
            dataType: "json",
            data: { "code": code, "param": annualdataEncrypted2, "token": token },
            success: function(json) {
                if (json.data.list && json.data.list.length > 0) {
                    if (json.data.list.length > 5) {
                        if (myjson4.data.keyword) {
                            myjson4.data.list = json.data.list.slice(0, 4);
                        } else {
                            myjson4.data.list = json.data.list.slice(0, 5);
                        }
                    } else {
                        myjson4.data.list = json.data.list.slice(0, json.data.list.length);
                    }
                    for (i = 0; i < myjson4.data.list.length; i++) {
                        myjson4.data.list[i].myimg = [];
                        if (myjson4.data.list[i].img.indexOf(",") > -1) {
                            myjson4.data.list[i].myimg[0] = myjson4.data.list[i].img.split(",")[0];
                        } else {
                            if (myjson4.data.list[i].img.length > 0) {
                                myjson4.data.list[i].myimg[0] = myjson4.data.list[i].img
                            } else {
                                myjson4.data.list[i].myimg[0] = $('#httpStatic').val() + '/public_trust/pc_gxzg/search/images/noshop.png';
                            }
                        }
                    }
                } else if (json.data.detail) {
                    if (json.data.detail.detail) {
                        var details = json.data.detail.detail
                        var obj = {
                            barCode: json.data.detail.barCode,
                            myimg: [],
                            companyName: details.info.companyName,
                            shopUrl: json.data.detail.shopUrl,
                            introduce: json.data.detail.introduce,
                            label: '2',
                            productName: json.data.detail.name,
                            myphone: []
                        }
                        obj.name2 = repalceKeyword(keyVal, json.data.detail.name, { element: 'em', className: 'kwordRed' })
                        obj.companyName2 = repalceKeyword(keyVal, json.data.detail.companyName, { element: 'em', className: 'kwordRed' });
                        obj.barCode2 = repalceKeyword(keyVal, json.data.detail.barCode, { element: 'em', className: 'kwordRed' });
                        if (json.data.detail.phone.indexOf(";") > -1) {
                            obj.myphone = json.data.detail.phone.split(";");
                        } else {
                            obj.myphone[0] = json.data.detail.phone;
                        }
                        // 图片默认只有一张，但是要转为数组
                        if (details.info.img.indexOf(";") > -1) {
                            obj.myimg = details.info.img.split(";");
                        } else {
                            obj.myimg[0] = [];
                            details.info.img.length > 0 ? obj.myimg[0] = details.info.img : obj.myimg[0] = $('#httpStatic').val() + '/public_trust/pc_gxzg/search/images/noshop.png';
                        }
                        myjson4.data.list.push(obj);
                    }
                }
                var htmlFind2 = template("shopFind", myjson4.data);
                document.getElementById("searchRightFindShop1").innerHTML = htmlFind2;
            }
        })

    }
    // 获取广告列表
    function getRAdv() {
        var adtype;
        if ($('.searchTab li.active').index() == 0) {
            adtype = "44";
        } else if ($('.searchTab li.active').index() == 1) {
            adtype = "45";
        } else {
            adtype = "46";
        }
        //请求参数
        var annualdata = '{"type":"' + adtype + '","start":"0","limit":"1"}';
        annualURL = http + getAdv;
        annualdataEncrypted = encrypt(annualdata, code, sign);
        $.ajax({
            url: annualURL,
            xhrFields: { withCredentials: true }, // 发送凭据
            type: "GET",
            dataType: "json",
            data: { "code": code, "param": annualdataEncrypted, "token": token },
            success: function(json) {
                if (adtype == "44") {
                    var ad = json.data.list && json.data.list.adv_44 && json.data.list.adv_44[0] ? json.data.list.adv_44[0] : [];
                    var htmlAd = template("rightAdDiv", ad);
                    document.getElementById("searchRightAd1").innerHTML = htmlAd;

                } else if (adtype == "45") {
                    var ad = json.data.list && json.data.list.adv_45 && json.data.list.adv_45[0] ? json.data.list.adv_45[0] : [];
                    var htmlAd = template("rightAdDiv", ad);
                    document.getElementById("searchRightAd2").innerHTML = htmlAd;
                } else {
                    var ad = json.data.list && json.data.list.adv_46 && json.data.list.adv_46[0] ? json.data.list.adv_46[0] : [];
                    var htmlAd = template("rightAdDiv", ad);
                    document.getElementById("searchRightAd3").innerHTML = htmlAd;
                }

            }
        })
    }
})