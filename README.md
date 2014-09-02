gscache - Google App Script Cache Manager
===========================================

**gscache** is a cache manager for Google Apps Script with persistence. 

With this simple cache you can truly persist in GAS (Google Apps Script) cache items: in cache and in ~~scriptDB~~ SpreadSheet. Cache is volatile, so, with persistence in ~~scriptDB~~ SpreadSheet you can guarantee items are available always.

It splits big items into little ones and it reassembles them when you request for a key.

How to use
-----------

Create a new script file in your project and copy the [code](https://github.com/davidayalas/gscache/blob/master/lib/gscache.js). Then, you can do:
		
* gscache.**put**(key, value[, ttl=0])<br />  

	- ttl: in seconds, default cache ttl is unlimited<br />  

* gscache.**get**(key)<br /><br />  

* gscache.**remove**(key)<br /><br />  

* gscache.**removeAll**()<br /><br />  


Sample code
------------

		function doGet(e) {
		  var c = gscache.get("publicflickr");

		  if(!c){
		    Logger.log("from live")
            var c = UrlFetchApp.fetch("http://api.flickr.com/services/rest/?format=json&method=flickr.photosets.getPhotos&photoset_id=72157631827789978&api_key=705379a7679d2edebe947274dacc997b").getContentText()
		    gscache.put("publicflickr", c, 3600)
		  }else{
		    Logger.log("from cache")
		  }
		  
		  return ContentService.createTextOutput(JSON.stringify(c)).setMimeType(ContentService.MimeType.JSON);;
		}


Spreadsheet vs ScriptDB
-------------------------

ScriptDB was a really cool feature in Google Apps Script, but it was deprecated in Nov 2014. Then, best alternative for pure Google Apps Script functionality was to use a SpreadSheet to persist data.

For each project that uses gscache a Spreadsheet will be generated in the root of your Drive. Each spreadsheet will have next name:

- gscache.keyprefix (default is "gscache_") + "spreadsheet" + timestamp: "gscache_spreadsheet_123456789"

Once the spreadsheet is created you can move it to the folder of your choice.