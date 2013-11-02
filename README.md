##Rackspace Cloudfiles url signer

Module to sign urls to allow access to the private blobs in rackspace cloud files

###To install

    npm install rackspace-cloudfiles-url-signer

###Use example

    var sig= require('rackspace-cloudfiles-url-signer');

    var account1 = sig.urlSigner('myusername', 'apikey');
    var account2 = sig.urlSigner('myotherusername', 'apikey2', {region: sig.REGIONS.CHICAGO});
    
    var url1 = account1.getUrl('GET', 'mycontainer', 'somefile.png', 10); //url expires in 10 minutes
    var url2 = account2.getUrl('PUT', 'mycontaineronotheraccount', '/somedir/somefile.png', 1); //url expires in 1 minute

###Usage Notes

* Rackspace relies on using a TempURL key that is attached to the metadata of your account. If you don't already have a TempKey set up, the
library will complain.
* Rackspace has different endpoints for different regions, so make sure your region is correct. The default is virginia (IAD)
* The source code is reasonably short and resonably commented, so read it if you have questions.

###Credits

Inspired by and derived from [amazon-s3-url-signer](https://github.com/dyashkir/amazon-s3-url-signer).

###License

BSD, because that's what amazon-s3-url-signer is
