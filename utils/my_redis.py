import redis
from settings import WORK


def redis_obj(db=8, port=6379):
    if WORK:
        host = 'r-bp1o2m5clvd160plug.redis.rds.aliyuncs.com'
        pool = redis.ConnectionPool(host=host, db=db, password='q4gWL4talMQyY9Ws', port=port, decode_responses=True)

    else:
        host = '127.0.0.1'
        pool = redis.ConnectionPool(host=host, db=db, port=port, decode_responses=True)

    return redis.Redis(connection_pool=pool)
