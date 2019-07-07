import re
import hashlib
import time
import random
import json as js
import requests
from json import JSONDecodeError
from lxml import etree
from requests.exceptions import InvalidHeader, MissingSchema, ReadTimeout
from utils.my_redis import redis_obj
from settings import WORK

try:
    from settings import DOWNLOAD_DELAY as dd
except ImportError:
    dd = random.random()


class Base(object):
    def __init__(self, **kwargs):
        self.robot_url = 'https://oapi.dingtalk.com/robot/send?access_token=72ca3145ae694bc76f603aa155fa7cee56c09bc8f2a1cfc9962327f8f608b9e0'
        super(Base, self).__init__(**kwargs)
        self.rd = redis_obj(db=10)
        self.ip = self.get_local_ip()
        self.sess = requests.Session()
        print('当前使用的ip: ', self.ip)

    def time_to_time(self, _time, _type="%Y-%m-%d %H:%M:%S"):
        """
        :param _time: 接收10或13位长度的时间戳
        :param _type: 返回类型
        :return: 2013-07-08 00:00:00, String类型
        """
        assert int(_time)
        if len(str(_time)) > 10:
            _time = int(int(_time) / 1000)
        return time.strftime(_type, time.localtime(int(_time)))

    def robot_msg(self, msg):  # 通过机器人发送错误信息
        if isinstance(msg, list):
            msg = ''.join(msg)
        elif isinstance(msg, dict):
            msg = self.json(msg)
        else:
            msg = str(msg)
        data = {"msgtype": "text", "text": {"content": msg}}
        requests.post(self.robot_url, json=data)

    def json(self, data):
        if not data:
            return None
        if isinstance(data, list):
            data = ''.join(data)
        if isinstance(data, str):
            try:
                data = js.loads(data)
            except JSONDecodeError:
                raise ValueError("要转换的数据不是标准 Json ! ! ")
            else:
                return data
        if isinstance(data, dict):
            return js.dumps(data, ensure_ascii=False)

    def to_md5(self, value):
        hs = hashlib.md5()
        hs.update(str(value).encode('utf-8'))
        return hs.hexdigest()

    def get_etree(self, data, _xpath=None):
        if not data:
            return ''
        if isinstance(data, bytes):
            data = str(data, encoding='utf-8')
        if not isinstance(data, etree._Element):
            data = etree.HTML(data)
        if _xpath:
            return data.xpath(_xpath)
        else:
            return data

    @staticmethod
    def get_filter(text):
        if not text:
            return ''
        if isinstance(text, list):
            text = ''.join(text)
        filter_list = [
            '\r', '\n', '\t', '\u3000', '\xa0',
            '<br>', '<br/>', '    ', '	', ' ', '&nbsp;', '>>', '↵', '展开全部'
        ]
        for fl in filter_list:
            text = text.replace(fl, '')
        return text

    def now_time(self, length=13):
        value = length - 10
        if value == 0:
            st = str(int(time.time()))
        else:
            st = str(int(int(time.time()) * (10 ** value)))
        return st

    def remove_html_tag(self, html):
        """
        s = '中国人寿财产<font color=red>保险</font>股份有限公司事故责任纠纷一案'
        re.sub('<[^>]*>', '', s)  ----> '中国人寿财产保险股份有限公司事故责任纠纷一案'
        """
        return re.sub('<[^>]*>', '', html)

    def _headers(self):
        return {
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36',
        }

    def get_ip(self):
        proxy_list = self.rd.hkeys('proxy')
        return random.choice(proxy_list) if proxy_list else ''

    def get_local_ip(self):
        r = requests.get('http://webapi.http.zhimacangku.com/getip?num=1&type=1&pro=&city=0&yys=0&port=1&pack=14529&ts=0&ys=0&cs=0&lb=1&sb=0&pb=4&mr=1&regions=')
        return r.text.strip("\r\n")

    def get_text(self, url, headers={}, method="get", refer=None, timeout=15, encoding=None, sess=True, **kwargs):
        if sess:
            func = getattr(self.sess, method)
        else:
            func = getattr(requests, method)
        if not headers:
            headers = self._headers()
        if refer:
            headers.update({"Referer": refer})
        kwargs.update(proxies={"http": "http://" + self.ip, "https": "http://" + self.ip})
        retry = 3 if not kwargs.get("RETRY_TIME") else kwargs['RETRY_TIME']
        while retry > 0:
            retry -= 1
            time.sleep(dd)
            try:
                r = func(url=url, headers=headers, timeout=timeout, **kwargs)
                if r.status_code == 200:
                    r.encoding = encoding or 'utf-8'
                    return r
                # elif r.status_code == 203:
                #     raise ConnectionError
                elif r.status_code == 401:
                    raise Exception('访问受限')
                elif r.status_code == 404:
                    raise Exception('对方服务器文件目录丢失')
                elif r.status_code >= 500:
                    raise Exception('对方服务器错误')
                # else:
                #     raise Exception('当前状态码: {}'.format(r.status_code))
            except ConnectionError:
                self.ip = self.get_local_ip()
                print('----更换ip1----')
                continue
            except ReadTimeout:
                print('----更换ip2----')
                continue
            except MissingSchema:
                print("url错误, %s" % url)
                continue
            except UnicodeEncodeError:
                print("编码错误---{}".format(url))
                break
            except InvalidHeader:
                print("refer错误--url:{}\n--refer:{}".format(url, refer))
                break
            except:
                print('----请求出错----')
                raise
        # else:
        #     raise Exception("重试次数超过限制! ")
