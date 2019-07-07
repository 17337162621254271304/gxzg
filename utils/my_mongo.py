from pymongo import MongoClient
from settings import WORK


def mongodb_obj(database_name, collection_name):
    if WORK:
        url = 'dds-bp1cdf865cf094441.mongodb.rds.aliyuncs.com'
        port = 3717
        ua = 'useradmin'
        psw = '2wsx#EDC!QAZ'
        client = MongoClient(url, port=port)
        _db = client['admin']
        _db.authenticate(ua, psw)
    else:
        client = MongoClient("localhost")
    return client[database_name][collection_name] if collection_name else client[database_name]
