# -*- coding: utf-8 -*-
import os
import time
from datetime import datetime
from pprint import pprint
import execjs
import math
from urllib.parse import quote
from utils.dictionaries import words
from spiders.base import Base
from utils.my_mongo import mongodb_obj
from selenium import webdriver

path = os.path.dirname(os.getcwd())
with open(os.path.join(path, 'Files/aes.js')) as f:
    js_text = execjs.compile(f.read())


class GszgSpider(Base):
    name = 'gszg'
    host = 'www.gxzg.org.cn'
    headers = {
        'Accept': 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'keep-alive',
        'Accept-Language': 'en', 'DNT': '1', 'Origin': 'http://www.gxzg.org.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    }
    br = webdriver.Chrome()

    def __init__(self, **kwargs):
        super(GszgSpider, self).__init__(**kwargs)
        self.name_db = mongodb_obj('工商信息', '工信中国')
        self.first_api = 'http://api.gxzg.org.cn/AccessToken/index?code=100000'
        self.search_uri = 'http://api.gxzg.org.cn/company/search?code=100000&param='
        self.contation_uri = 'http://api.gxzg.org.cn/company/contactInfo?code=100000&param='
        self.base_info_uri = 'http://api.gxzg.org.cn/company/base?code=100000&param='
        self.gudong_uri = 'http://api.gxzg.org.cn/company/investorList?code=100000&param='
        self.major_people_uri = 'http://api.gxzg.org.cn/company/staffList?code=100000&param='
        self.fzjg_uri = 'http://api.gxzg.org.cn/company/branchList?code=100000&param='
        self.dwtz_uri = 'http://api.gxzg.org.cn/company/investList?code=100000&param='
        self.change_uri = 'http://api.gxzg.org.cn/company/changeInfoList?code=100000&param='
        self.year_page = 'http://api.gxzg.org.cn/company/annualList?code=100000&param='
        self.gudong_type_map = {'1': '自然人股东/企业法人', '2': '其他投资者'}
        self.列表页 = '{"keyword":"%s","page":%s,"limit":%s}'
        self.年报 = '{"id": "%s","page":"1"}'
        self.联系方式_基础信息 = '{"id": "%s"}'
        self.股东信息_主要人员 = '{"id": "%s","page":"%s","ispage":"1"}'
        self.分支机构_对外投资_变更记录 = '{"id": "%s","page":"%s"}'

    def add_data(self, obj, key, data):
        obj[key].append(data)
        return obj

    def get_words(self):
        # for da in words:
        #     name = da.strip()
        #     if len(name) >= 2:
        #         yield name
        # for name in self.name_db.find({"name": {"$exists": True}}):
        #     try:
        #         if len(name['name']) >= 2:
        #             yield name['name']
        #     except (KeyError, ValueError, Exception):
        #         pass
        # yield '华为技术'
        yield '魅族科技'

    def get_all_pages(self, count):
        if isinstance(count, str):
            count = int(count)
        return 1 if not count else math.ceil(count / 10)

    @staticmethod
    def get_uri(major, _uri, token):
        arg = major, '100000', 'aa2144dc6c6e12e0'
        param = js_text.call('encrypt', *arg)
        return _uri + quote(param) + '&token=' + quote(token)

    def choice_result(self, response, count=False):
        _json_obj = self.json(response.text)
        if _json_obj and _json_obj['data']:
            json_obj = _json_obj['data']
            if count:
                return self.get_all_pages(int(json_obj['count'])) if int(json_obj['count']) > 20 else 1
            else:
                return json_obj
        else:
            return dict()

    def run(self):
        for name in self.get_words():
            self.start_requests(name)

    def start_requests(self, name):
        print('开始请求---')
        self.headers.update({"Referer": 'http://www.gxzg.org.cn/s/company?kw={}'.format(quote(name))})
        response = self.get_text(url=self.first_api, headers=self.headers, sess=False)
        json_obj = self.choice_result(response)
        if json_obj:
            item = {"name": name, 'token': json_obj}
            url = self.get_uri(major=self.列表页 % (name, 1, 10), _uri=self.search_uri, token=json_obj)
            self.headers.update({"Referer": 'http://www.gxzg.org.cn/s/company?kw={}'.format(quote(name))})
            html = self.get_text(url=url, headers=self.headers, sess=False)
            self.list_pages(html, item)

    def list_pages(self, response, meta):
        print('list_pages---')
        json_obj = self.choice_result(response)
        if json_obj:
            name, token = meta['name'], meta['token']
            ## 添加去重判断---------
            # pages = self.get_all_pages(json_obj['count'])
            pages = 1
            for page in range(pages):
                url = self.get_uri(major=self.列表页 % (name, page + 1, 10), _uri=self.search_uri, token=token)
                html = self.get_text(url=url, headers=self.headers, sess=False)
                self.company_list(html, meta)

    def company_list(self, response, meta):
        print('company_list---')
        json_obj = self.choice_result(response)
        if json_obj:
            for result in json_obj['list']:
                # result = json_obj['list'][0]
                name, company_id = result['companyName'], result['companyId']
                meta = {
                    '主要人员': list(), '股东信息': list(), '变更信息': list(), '企业年报': list(),
                    '对外投资': list(), '分支机构': list(), '基础信息': dict(), "companyId": company_id, 'companyName': name
                }
                refer = 'http://www.gxzg.org.cn/detail/{}'.format(company_id)
                self.headers.update({"Referer": refer})
                html = self.get_text(url=self.first_api, headers=self.headers)
                self.parse_index(html, meta, refer)

    def parse_index(self, response, meta, refer):
        print('parse_index---')
        json_obj = self.choice_result(response)
        if json_obj:
            name, company_id = meta['companyName'], meta['companyId']
            meta.update({"token": json_obj})
            url = self.get_uri(
                major=self.联系方式_基础信息 % company_id, _uri=self.contation_uri, token=json_obj
            )
            self.br.get(refer)
            time.sleep(2)
            html = self.get_text(url=url, headers=self.headers)
            self.联系信息(html, meta)

    def 联系信息(self, response, meta):
        print('联系信息---')
        json_obj = self.choice_result(response)
        if json_obj:
            meta['基础信息'].update({
                '电话': json_obj['phone'], '企业网址': json_obj['officialUrl'],
                '住所': json_obj['companyAddress'], '邮箱': json_obj['email']
            })
            url = self.get_uri(
                major=self.联系方式_基础信息 % meta['companyId'], _uri=self.base_info_uri, token=meta['token']
            )
            html = self.get_text(url=url, headers=self.headers)
            self.基础信息(html, meta)

    def 基础信息(self, response, meta):
        print('基础信息---')
        json_obj = self.choice_result(response)
        if json_obj:
            yyqx = json_obj['fromTime'] + '至' + json_obj['toTime']  # 营业期限
            yyqx = '' if len(yyqx) < 5 else yyqx
            meta['基础信息'].update({
                '统一社会信用代码': json_obj.get('creditCode'), '纳税人识别号': json_obj.get('taxNumber'),
                '注册资本': json_obj.get('regCapital'), '成立日期': json_obj.get('estiblishDate'),
                '经营状态': json_obj.get('regStatus'), '行业': json_obj.get('industry'), '营业期限': yyqx,
                '法定代表人': json_obj.get('legalPersonName'), '登记机关': json_obj.get('regInstitute'),
                '经营范围': json_obj.get('businessScope'), '类型': json_obj.get('companyOrgType'),
                '英文名': json_obj.get('property3'), '核准日期': json_obj.get('approvedDate')
            })
            meta.update({"page": '1'})
            url = self.get_uri(
                major=self.股东信息_主要人员 % (meta['companyId'], 1), _uri=self.gudong_uri,
                token=meta['token']
            )
            html = self.get_text(url=url, headers=self.headers)
            self.股东信息(html, meta)

    def 股东信息(self, response, meta):
        print('股东信息---')
        json_obj = self.choice_result(response)
        if json_obj:
            for result in json_obj['list']:
                try:
                    _type = self.gudong_type_map[str(result['type'])]
                except KeyError:
                    self.robot_msg(meta['name'] + ': 股东类型 需要补全!!')
                    _type = '自然人股东/企业法人'
                try:
                    k, k1, k2 = result['capital'][0]['percent'], result['capital'][0]['amomon'], result['name']
                except (KeyError, IndexError):
                    k, k1, k2 = '未公开', '未公开', '未公开'
                meta['股东信息'].append({
                    '股东': k2, '股东类型': _type, '出资比例': k, '认缴出资额': k1, '实缴出资额': ''
                })
            else:
                page = int(meta['page'])
                if 0 < page * 20 < int(json_obj['count']):
                    page += 1
                    meta.update({"page": str(page)})
                    url = self.get_uri(
                        major=self.股东信息_主要人员 % (meta['companyId'], page), _uri=self.gudong_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.股东信息(html, meta)
                else:
                    meta.update({"page": '1'})
                    url = self.get_uri(
                        major=self.股东信息_主要人员 % (meta['companyId'], 1),
                        _uri=self.major_people_uri, token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.主要人员(html, meta)

    def 主要人员(self, response, meta):
        print('主要人员---')
        json_obj = self.choice_result(response)
        if json_obj:
            for result in json_obj['list']:
                meta['主要人员'].append({"姓名": result['name'], "职位": result['position']})
            else:
                page = int(meta['page'])
                if 0 < page * 20 < int(json_obj['count']):
                    page += 1
                    meta.update({"page": str(page)})
                    url = self.get_uri(
                        major=self.股东信息_主要人员 % (meta['companyId'], page), _uri=self.major_people_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.主要人员(html, meta)
                else:
                    meta.update({"page": '1'})
                    url = self.get_uri(
                        major=self.分支机构_对外投资_变更记录 % (meta['companyId'], 1), _uri=self.fzjg_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.分支机构(html, meta)

    def 分支机构(self, response, meta):
        print('分支机构---')
        json_obj = self.choice_result(response)
        if json_obj:
            for result in json_obj['list']:
                meta['分支机构'].append({
                    "企业名称": result['name'], "法定代表人": result['legalPersonName'],
                    "注册时间": result['estiblishTime'], "经营状态": result['regStatus']
                })
            else:
                page = int(meta['page'])
                if 0 < page * 20 < int(json_obj['count']):
                    page += 1
                    meta.update({"page": str(page)})
                    url = self.get_uri(
                        major=self.分支机构_对外投资_变更记录 % (meta['companyId'], page), _uri=self.fzjg_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.分支机构(html, meta)
                else:
                    meta.update({"page": '1'})
                    url = self.get_uri(
                        major=self.分支机构_对外投资_变更记录 % (meta['companyId'], 1), _uri=self.dwtz_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.对外投资(html, meta)

    def 对外投资(self, response, meta):
        print('对外投资---')
        json_obj = self.choice_result(response)
        if json_obj:
            for result in json_obj['list']:
                meta['对外投资'].append({
                    "被投资企业名称": result['name'], "被投资法定代表人": result['legalPersonName'],
                    "投资占比": result['percent'], "注册资本": result['amount'], "状态": result['regStatus'],
                    "注册时间": self.time_to_time(result['estiblishTime'])
                })
            else:
                page = int(meta['page'])
                if 0 < page * 20 < int(json_obj['count']):
                    page += 1
                    meta.update({"page": str(page)})
                    url = self.get_uri(
                        major=self.分支机构_对外投资_变更记录 % (meta['companyId'], page), _uri=self.dwtz_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.对外投资(html, meta)
                else:
                    meta.update({"page": '1'})
                    url = self.get_uri(
                        major=self.分支机构_对外投资_变更记录 % (meta['companyId'], 1), _uri=self.change_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.变更信息(html, meta)

    def 变更信息(self, response, meta):
        print('变更信息---')
        json_obj = self.choice_result(response)
        if json_obj:
            for result in json_obj['list']:
                try:
                    meta['变更信息'].append({
                        "变更日期": result['changeTime'], "变更项目": result['changeItem'],
                        "变更前": result['contentAfter'], "变更后": result['contentBefore']
                    })
                except KeyError:
                    print('数据: ', json_obj)
                    raise
            else:
                page = int(meta['page'])
                if 0 < page * 20 < int(json_obj['count']):
                    page += 1
                    meta.update({"page": str(page)})
                    url = self.get_uri(
                        major=self.分支机构_对外投资_变更记录 % (meta['companyId'], page), _uri=self.change_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.变更信息(html, meta)
                else:
                    self.headers.update(
                        {"Referer": 'http://www.gxzg.org.cn/detail/%s/annual' % meta['companyId']}
                    )
                    url = self.get_uri(
                        major=self.联系方式_基础信息 % (meta['companyId']), _uri=self.contation_uri,
                        token=meta['token']
                    )
                    html = self.get_text(url=url, headers=self.headers)
                    self.new_code(html, meta)

    def new_code(self, response, meta):
        print('new_code---')
        json_obj = self.choice_result(response)
        if json_obj:
            url = self.get_uri(
                major=self.年报 % (meta['companyId']), _uri=self.year_page,
                token=meta['token']
            )
            html = self.get_text(url=url, headers=self.headers)
            self.企业年报(html, meta)

    def 企业年报(self, response, meta):
        print('企业年报---')
        json_obj = self.choice_result(response)
        if json_obj:
            for result in json_obj['list']:
                year = result['baseInfo']['reportYear']
                if isinstance(result, dict):
                    result = self.json(result)
                public = str(int(year) + 1)
                meta['企业年报'].append({
                    "年度": year, "公示日期": public, "源码": result
                })
            else:
                del meta['page']
                del meta['token']
                del meta['companyId']
                name = meta.pop('companyName')
                meta.update({
                    'company_name': name, 'status': 1, 'save_time': datetime.now(),
                    'data_source': '公信中国'
                })
                self.save_data(meta)

    def save_data(self, data):
        print('save_data---')
        _id = self.name_db.insert_one(data)
        print(_id.inserted_id, '已存储')


if __name__ == '__main__':
    gs = GszgSpider()
    gs.run()
