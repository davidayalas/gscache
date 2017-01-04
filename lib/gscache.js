/*
*
* Singleton object for cache management with persitence in cache and in db
* It splits large cache objects into little ones
*
*/
var gscache = (function(){

  /**
  * PRIVATE MEMBERS
  *
  */

  var cache = CacheService.getScriptCache(),
      sheet = null,
      keyprefix = "gscache_",
      maxsize = 50000
  ;
  
  /**
  * gets cache object
  */  
  function _getCache(){
    return cache;
  }
  
  /**
  * gets sheet
  */  
  function _getSheet(){
    return sheet;
  }

  /**
  * sets sheet
  */  
  function _setSheet(sh){
    sheet = sh;
  }

  /**
  * get block maxsize
  */  
  function _getSize(){
    return maxsize;
  }

  /**
  * set block maxsize
  */  
  function _setSize(max){
    maxsize = max;
  }

  /**
  * get cache keys prefix
  */  
  function _getKeyPrefix(){
    return keyprefix;
  }

  /**
  * set cache keys prefix
  */  
  function _setKeyPrefix(key){ 
    keyprefix = key;
  }

  /**
  * Inits or creates a spreadsheet to persist data (ScriptDB will be deprecated in Nov 14)
  */
  function _initSheet(){
    var sskey = PropertiesService.getScriptProperties().getProperty("ss_key");
    var ss = null;
    if(sskey!==null){
      try{
        ss = SpreadsheetApp.openById(sskey);
        ss.getActiveSheet();
      }catch(e){
        Logger.log(e)
        PropertiesService.getScriptProperties().deleteProperty("ss_key");
        //...
      }
    }else{
      ss = SpreadsheetApp.create(_getKeyPrefix() + "spreadsheet_"+(+new Date())); //creates a SpreadSheet for project, not a shared one 
      PropertiesService.getScriptProperties().setProperty("ss_key", ss.getId());
    }
    _setSheet(ss.getActiveSheet()); 
  }

  /**
  * Gets a value from Sheet
  *
  * @param {String} key
  *
  * @return {String} value
  */   
  function _getFromSheet(key){    
    if(_getSheet()===null){
      _initSheet();
    }
    
    var row = _findInSheet(key);
    var value = "";
    if(row>-1){
      value = _getSheet().getRange(row,2).getValues()[0][0];

      if(_getSheet().getRange("B"+row+":D"+row).getValues()[0][2]==="undefined"){
        Logger.log("puts " + key + " in cache");
        _getCache().put(key, value);
        return value;
      }
      
      //test if ttl is expired and removes it from sheet
      if((+new Date()-_getSheet().getRange("B"+row+":D"+row).getValues()[0][1])/1000>_getSheet().getRange("B"+row+":D"+row).getValues()[0][2]){
        _remove(key.replace(_getKeyPrefix(),"").replace("_0",""));
      }else{
        Logger.log("puts " + key + " in cache");
        //setup the ttl updated
        //Logger.log(parseInt(_getSheet().getRange("B"+row+":D"+row).getValues()[0][2]-(+new Date()-_getSheet().getRange("B"+row+":D"+row).getValues()[0][1])/1000))
        _getCache().put(key, value, parseInt(_getSheet().getRange("B"+row+":D"+row).getValues()[0][2]-(+new Date()-_getSheet().getRange("B"+row+":D"+row).getValues()[0][1])/1000)); 
        return value;  
      }
    }
    return null;
  }

  /**
  * Remove a row from Sheet
  *
  * @return {Boolean} if exists or not 
  */ 
  function _removeFromSheet(key){    
    if(_getSheet()===null){
      _initSheet();
    }
    
    var row = _findInSheet(key)
    if(row>-1){
      _getSheet().appendRow([""]); //if not, it crashes when only one row left.
      _getSheet().deleteRow(row);
    }
    return row===-1?false:true; 
  }
  
  /**
  * Saves a key to Sheet
  *
  * @param {Object} key
  */  
  function _saveToSheet(data){    
    if(_getSheet()===null){
      _initSheet();
    }
    
    var row = _findInSheet(data.id);
    if(row>-1){
      _getSheet().getRange("B"+row+":D"+row).setValues([[data.data, data.timestmp,data.ttl]]);
    }else{
      _getSheet().appendRow([data.id,data.data,data.timestmp,data.ttl]);
    }
  }
  
 /**
  * Finds a key in spreadsheet
  *
  * @param {String} key
  *
  * @return {Number} row
  */   
  function _findInSheet(key){
    if(_getSheet()===null){
      _initSheet();
    }
    //key = this.keyprefix + key
    var row = 1;
    var cell = _getSheet().getRange(row,1).getValues()[0][0];
    var found = false;
    while(cell!=="" && found===false){
      if(cell===key){
        found=true;
      }else{
        row++;
        cell = _getSheet().getRange(row,1).getValues()[0][0];
      }
    } 
    return found?row:-1;
  }
  
  /**
  * Generic remove function, from cache and sheet
  *
  */   
  function _remove(key){
    if(_getSheet()===null){
      _initSheet();
    }
    
    key = _getKeyPrefix() + key;
    
    var cont = 0;
    var found = _removeFromSheet(key + "_" + cont);
    _getCache().remove(key+"_" + cont);
    
    if(found){
      while(found){
        cont++;
        found=_removeFromSheet(key + "_" + cont);
        _getCache().remove(key + "_" + cont);
      }
    }else{
      cont = 0;
      found = _getCache().get(key+"_"+cont);
      while(found){
        _getCache().remove(key+"_"+cont)
        cont++;
        found = _getCache().get(key+"_"+cont);
      }
      _removeFromSheet(key);
      _getCache().remove(key);
    }  
  }
  
  /**
  * PUBLIC MEMBERS
  *
  */
  
  return {
  
    /**
    * Sets a key
    *
    * @param {String} key
    * @param {String, Object} value
    * @param {Number} ttl
    */  
    put : function(key, value, ttl){
      if(typeof(key)!="string"){
        Logger.log("key has to be a string");timestmp
        return;
      }
      this.remove(key);
      key = _getKeyPrefix() + key;
      var valuec = typeof value=="object" ? JSON.stringify(value) : ""+value;

      var timestamp = (new Date()).getTime();
      var maxsize = _getSize();  
      if(valuec.length>maxsize){
        var keys = [];
        var blocks = valuec.length/maxsize;
        var res = valuec.length%maxsize;
        var caches = {};
        var cont = 0;
        
        while(cont<blocks){
          caches[key+"_"+parseInt(cont)] = valuec.slice(cont*maxsize,((cont+1)*(maxsize)));
          keys.push(key+"_"+cont);value
          _saveToSheet({id:key+"_"+parseInt(cont),timestmp:timestamp,data:caches[[key+"_"+cont]],'ttl':ttl});
          cont++;
        }
        
        if(res>0){          
          if(valuec.slice(cont*maxsize,((cont)*(maxsize))+res+1).length>0){
            caches[key+"_"+parseInt(cont)] = valuec.slice(cont*maxsize,((cont)*(maxsize))+res+1);
            keys.push(key+"_"+cont);
            _saveToSheet({id:key+"_"+parseInt(cont),timestmp:timestamp,data:caches[[key+"_"+cont]],'ttl':ttl});
          }
        }
        _getCache().removeAll(keys)
        ttl ? _getCache().putAll(caches, time=ttl) : _getCache().putAll(caches)
      }else{
        ttl ? _getCache().put(key,valuec,ttl) : _getCache().put(key,valuec);
        _saveToSheet({id:key,timestmp:timestamp,data:valuec,'ttl':ttl});
      }
    },
      
    /**
    * Gets a key
    *
    * @param {String} key
    * @param {Boolean} retrieveLast
    *        to force the return of last value           
    * @return {Object,String,Iterator}
    */  
    get : function(key,retrieveLast){
      var v=null, cached=null;
  
      if(typeof(key)=="string" || !isNaN(key)){
        key = _getKeyPrefix() + key;
      }
  
      var cached = _getCache().get(key);

      if(cached!==null){
        v = cached;
        Logger.log(key.replace(_getKeyPrefix(),"") + " from cache");
      }else{
        //tries if cache key is splitted
        var cont = 0;
        cached = _getCache().get(key + "_" + parseInt(cont));
        Logger.log("trying from splitted cache " + key + "_" + parseInt(cont))
        if(cached==null){//retry in sheet
          Logger.log("trying from splitted item in persistent store " + key + "_" + parseInt(cont))
          cached = _getFromSheet(key + "_" + parseInt(cont));
        }
        if(cached!=null){ //cache key is splitted due to size limits
          var stb = [];
          while(cached!=null){
            stb.push(cached);
            cont++;
            cached = _getCache().get(key + "_" + cont);
            if(cached==null){ //retry in sheet
              cached = _getFromSheet(key + "_" + parseInt(cont));
            }
          }
          Logger.log(key.replace(_getKeyPrefix(),"") + " from cache (splitted)");
          v = stb.join("");
        } 
      }
      
      if(v===null){
        //tries in SpreadSheet
        v = _getFromSheet(key);
      }
  
      try{
        v = JSON.parse(v);
      }catch(e){
        //...
      }
      return v;
    },
    
    /**
    * Remove contents in cache from a key
    *
    * @param {String} key
    */  
    remove : function(key){
      _remove(key);
    },
    
    /**
    * Remove all contents in cache
    *
    */  
    removeAll : function(){
      if(_getSheet()===null){
        _initSheet();
      }
  
      var row = 1;
      var cell = _getSheet().getRange(row,1).getValues()[0][0];
      while(cell!==""){
        //_getSheet().deleteRow(1);
        _getCache().remove(cell);
        row++;
        cell = _getSheet().getRange(row,1).getValues()[0][0];
      }
      
      //deletes sheet and creates a new one
      var ss = null;
      try{
        ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("ss_key"));
        ss.getActiveSheet();
      }catch(e){
        _setSheet(null);
        PropertiesService.getScriptProperties().deleteProperty("ss_key");
      }
   
      if(ss!==null){
        ss.insertSheet(1);
        ss.deleteSheet(_getSheet());
        _setSheet(ss.getActiveSheet()); 
      }
  
    }
  
  }
  
})();
