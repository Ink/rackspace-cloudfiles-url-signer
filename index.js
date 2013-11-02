var crypto = require('crypto');
var request = require("request");
var _  = require("underscore");

exports.REGIONS = {};
exports.REGIONS.VIRGINIA = "IAD";
exports.REGIONS.DALLAS = "DFW";
exports.REGIONS.CHICAGO = "ORD";

//The most concise and direct discussion of how to create signed urls is at
//http://www.rackspace.com/blog/rackspace-cloud-files-how-to-create-temporary-urls/
exports.urlSigner = function(account, apikey, options){
    options = options || {};
    var tempUrlKey = options.tempUrlKey;
    var region = options.region || exports.REGIONS.VIRGINIA;
    var authEndpoint = options.authEndpoint || 'https://identity.api.rackspacecloud.com/v2.0/';
    var port = options.port || '443';

    var accountInfo = null;

    //Retrives the endpoints, tokens, etc. for the account provided
    var getAccountInfo = function(callback) {
        if (accountInfo) {
            //cached
            callback(null, accountInfo);
        } else {
            request.post(authEndpoint + "tokens", {
                json: true,
                body: { auth: {"RAX-KSKEY:apiKeyCredentials": {
                    username: account,
                    apiKey: apikey}}}
            }, function(error, response, body) {
                if (error) {
                    callback(error);
                } else {
                    var cloudFiles = _.findWhere(body.access.serviceCatalog, {name: "cloudFiles"});
                    if (!cloudFiles) {
                        callback(new Error("This app is not authorized to access cloud files")); return;
                    }
                    var endpoint = _.findWhere(cloudFiles.endpoints, {region: region});
                    if (!endpoint) {
                        callback(new Error("There is no cloud files access configured for the region " + region)); return;
                    }

                    accountInfo = {};
                    accountInfo.token = body.access.token.id;
                    accountInfo.publicURL = endpoint.publicURL;
                    accountInfo.accountId = endpoint.tenantId;
                    callback(null, accountInfo);
                }
            });
        }
    };

    var getTempUrlKey = function(publicURL, token, callback) {
        //We do the check here to keep other code simpler
        if (tempUrlKey) {
            callback(null, tempUrlKey); return;
        }
        request.head(publicURL, {
            headers: {"X-Auth-Token": token}
        }, function(error, response, body) {
            if (error) {
                callback(error);
            } else {
                tempUrlKey = response.headers['x-account-meta-temp-url-key'];
                if (!tempUrlKey) {
                    callback(new Error("Temp URL Key has not been set for this account, please set it. \n"+
                            "See http://docs.rackspace.com/files/api/v1/cf-devguide/content/Set_Account_Metadata-d1a4460.html for more details"));
                } else {
                    callback(null, tempUrlKey);
                }
            }
        });
    };

    //Rackspace likes sha1 & hex
    var hmacSha1 = function (message, key) {
        return crypto.createHmac('sha1', key).update(message, 'utf-8').digest('hex');
    };

    var constructUrl = function (accountUrl, container, path) {
        var url = accountUrl + '/' + container;

        if (path) {
            url += (path[0] === '/'?'':'/') + path;
        }

        return url;
    };

    var calculateParamsForKey = function(verb, container, path, expiresInMinutes, key, accountId) {
        var expires = new Date();
        //Date automagically wraps things over 60. Very convenient
        expires.setMinutes(expires.getMinutes() + expiresInMinutes);

        var expireTime = parseInt(expires.getTime() / 1000, 10);

        var uri = "/v1/" + accountId + "/" + container;
        if (path) {
            uri += (path[0] === '/'?'':'/') + path;
        }

        var stringToSign = verb + "\n" + expireTime + "\n" + uri;

        var hashed = hmacSha1(stringToSign, key);

        return "?temp_url_sig=" + hashed + "&temp_url_expires=" + expireTime;
    };

    return {
        getUrl : function(verb, container, path, expiresInMinutes, callback){
            getAccountInfo(function(error, account){
                if (error) {
                    callback(error); return;
                }
                getTempUrlKey(account.publicURL, account.token, function(error, key){
                    if (error) {
                        callback(error); return;
                    }
                    var urlRet = constructUrl(account.publicURL, container, path) + calculateParamsForKey(verb, container, path, expiresInMinutes, key, account.accountId);
                    callback(null, urlRet);
                });
            });
        }
    };

};

