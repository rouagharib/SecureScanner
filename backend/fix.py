import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from bson import ObjectId

async def fix():
    client = AsyncIOMotorClient('mongodb+srv://admin_roua:rouapfedev@stacksafe0.t58kkot.mongodb.net/securescan?appName=StackSafe0')
    db = client['securescan']
    now = datetime.now(timezone.utc)
    await db['subscriptions'].update_one(
        {'user_id': '69f7c6370835f75c0264e045'},
        {'$set': {
            'user_id': '69f7c6370835f75c0264e045',
            'plan': 'standard',
            'billing_cycle': 'monthly',
            'status': 'active',
            'stripe_customer_id': 'cus_US3FCegcSAzguW',
            'stripe_subscription_id': 'sub_1TT98aBAnRawt1nvQCLJ3MsH',
            'current_period_start': now,
            'current_period_end': now + timedelta(days=30),
            'cancel_at_period_end': False,
            'updated_at': now,
            'limits': {'scans': 100, 'courses': 20, 'labs': 20, 'certifications': 1, 'jobs': 10}
        }, '$setOnInsert': {'created_at': now}},
        upsert=True
    )
    await db['users'].update_one(
        {'_id': ObjectId('69f7c6370835f75c0264e045')},
        {'$set': {'subscription_plan': 'standard'}}
    )
    print('Done')

asyncio.run(fix())