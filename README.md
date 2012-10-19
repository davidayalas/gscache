Google App Script Cache with persistence in DB
===============================================

With this simple cache you can truly persist in GAS (Google Apps Script) cache items: in cache and in scriptDB. Cache is volatile, so, with persistence in scriptDB you can guarantee items are available always.

It splits big cache items into little ones and it reassembles them when you request for a key.

How to use
-----------

Create a new script file in your project and copy the code. Then, you can do:
		
* gscache.**put**(key, value[, ttl=0])<br />  

	- ttl: in seconds, default cache ttl is unlimited<br />  

* cache.**get**(key)<br /><br />  

* cache.**remove**(key)<br /><br />  


Sample code
------------

		function doGet(e) {
		  var c = gscache.get("twitterprofile");

		  if(!c){
		    Logger.log("from live")
            var c = UrlFetchApp.fetch("http://api.twitter.com/1/statuses/user_timeline.json?screen_name=davidayalas").getContentText()
		    gscache.put("twitterprofile", c, 3600)
		  }else{
		    Logger.log("from cache")
		  }
          Logger.log(JSON.stringify(c))
		  return ContentService.createTextOutput(JSON.stringify(c)).setMimeType(ContentService.MimeType.JSON);;
		}
