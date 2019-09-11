/**
 * Modules from the community: package.json
 */
var crypto = require('crypto');
var got = require('got');

var production = 'https://secure.usaepay.com/api/';
var sandbox = 'https://sandbox.usaepay.com/api/';

/**
 * Constructor
 */
var usaepay = function (config)
{
    var self = this;

    self.Card = {
        Create: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.cardNumber, 'options.cardNumber');
            self.Util.validateArgument(options.exp, 'options.exp');

            var data = {
                'command': 'cc:save',
                'creditcard':
                {
                    'number': options.cardNumber,
                    'expiration': options.exp
                }
            };

            if (options.firstName && options.lastName)
            {
                data.creditcard.cardholder = options.firstName + ' ' + options.lastName;
            }
            if (options.address)
            {
                data.creditcard.avs_street = options.address;
            }
            if (options.zipcode)
            {
                data.creditcard.avs_zip = options.zipcode;
            }
            if (options.cvv)
            {
                data.creditcard.cvc = options.cvv;
            }

            return got.post(self.baseUrl + 'transactions',
            {
                body: data,
                json: true,
                headers:
                {
                    'Authorization': 'Basic ' + self.authKey,
                    'Content-Type': 'application/json'
                }
            }).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (!res.body || res.body.result_code !== 'A')
                {
                    throw new Error('Card not approved');
                }

                if (!res.body.savedcard || !res.body.savedcard.cardnumber)
                {
                    throw new Error('Card could not be saved');
                }

                return res.body.savedcard.cardnumber;
            });
        },
        Sale: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.amount, 'options.amount');
            self.Util.validateArgument(options.foreignKey, 'options.foreignKey');

            var data = {
                'command': 'cc:sale',
                'creditcard':
                {
                    'number': options.foreignKey,
                    'expiration': '0000'
                },
                'amount': options.amount
            };

            return got.post(self.baseUrl + 'transactions',
            {
                body: data,
                json: true,
                headers:
                {
                    'Authorization': 'Basic ' + self.authKey,
                    'Content-Type': 'application/json'
                }
            }).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (!res.body || res.body.result_code !== 'A' || !res.body.refnum)
                {
                    throw new Error('Transaction not approved');
                }

                return res.body.refnum;
            });
        },
        Void: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.transactionForeignKey, 'options.transactionForeignKey');

            var data = {
                'command': 'void',
                'refnum': options.transactionForeignKey
            };

            return got.post(self.baseUrl + 'transactions',
            {
                body: data,
                json: true,
                headers:
                {
                    'Authorization': 'Basic ' + self.authKey,
                    'Content-Type': 'application/json'
                }
            }).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (!res.body || res.body.result_code !== 'A' || !res.body.refnum)
                {
                    throw new Error('Transaction not voided');
                }

                return res.body.refnum;
            });
        },
        Refund: function (options)
        {
            self.Util.validateArgument(options, 'options');
            self.Util.validateArgument(options.transactionForeignKey, 'options.transactionForeignKey');

            var data = {
                'command': 'refund',
                'amount': otions.amount,
                'refnum': options.transactionForeignKey
            };

            return got.post(self.baseUrl + 'transactions',
            {
                body: data,
                json: true,
                headers:
                {
                    'Authorization': 'Basic ' + self.authKey,
                    'Content-Type': 'application/json'
                }
            }).then(function (res)
            {
                if (!res) self.Util.throwInvalidDataError(res);

                if (!res.body || res.body.result_code !== 'A' || !res.body.refnum)
                {
                    throw new Error('Transaction not refunded');
                }

                return res.body.refnum;
            });
        }
    };

    self.Util = {
        validateArgument: function (arg, name)
        {
            if (arg === null || arg === undefined)
            {
                throw new Error('Required argument missing: ' + name);
            }
        },
        throwInvalidDataError: function (res)
        {
            throw new Error('Invalid response data: ' + JSON.stringify(res));
        },
        authenticate: function ()
        {
            var seed = "abcdefghijklmnop";
            var prehash = config.key + seed + config.pin;
            var apihash = 's2/' + seed + '/' + crypto.createHash('sha256').update(prehash).digest('hex');

            return Buffer.from(config.key + ":" + apihash).toString('base64');
        }
    };

    self.Util.validateArgument(config.key, 'key');
    self.Util.validateArgument(config.pin, 'pin');
    self.Util.validateArgument(config.urlsuffix, 'urlsuffix');
    self.Util.validateArgument(config.environment, 'environment');

    self.CONFIG = JSON.parse(JSON.stringify(config));

    self.baseUrl = sandbox;
    if (self.CONFIG.environment === 'Production')
    {
        self.baseUrl = production;
    }
    self.baseUrl = self.baseUrl + config.urlsuffix + '/';

    self.authKey = self.Util.authenticate();

    return self;
};

module.exports = usaepay;