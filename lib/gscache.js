/*
*
* Singleton object for cache management with persitence in cache and in db
* It splits large cache objects into little ones
*
*/

var gscache = {
  cache : CacheService.getPublicCache(),
  db : ScriptDb.getMyDb(),
  keyprefix : "gscache_",
  maxsize : 100000,
  
 /**
  * Sets a key
  *
  * @param {String} key
  * @param {String, Object} value
  * @param {Number} ttl
  */  
  put : function(key, value, ttl){
    if(typeof(key)!="string"){
      Logger.log("key has to be a string");
      return;
    }
    this.remove(key);
    key = this.keyprefix + key;
    var valuec = typeof value=="object" ? JSON.stringify(value) : value;
    
    var timestamp = (new Date()).getTime();
    
    if(valuec.length>this.maxsize){
      var keys = [];
      var blocks = valuec.length/this.maxsize;
      var res = valuec.length%this.maxsize;
      var caches = {};
      var cont = 0;
      
    while(cont<blocks){
    caches[key+"_"+parseInt(cont)] = valuec.slice(cont*this.maxsize,((cont+1)*(this.maxsize)));
        keys.push(key+"_"+cont);
        this.db.save({id:key+"_"+parseInt(cont),timestmp:timestamp,data:caches[[key+"_"+cont]],'ttl':ttl});
        cont++;
      }
      
      if(res>0){
    caches[key+"_"+parseInt(cont)] = valuec.slice(cont*this.maxsize,((cont)*(this.maxsize))+res+1);
        keys.push(key+"_"+cont);
        this.db.save({id:key+"_"+parseInt(cont),timestmp:timestamp,data:caches[[key+"_"+cont]],'ttl':ttl});
      }
      this.cache.removeAll(keys)
      ttl ? this.cache.putAll(caches, time=ttl) : this.cache.putAll(caches)
    }else{
      ttl ? this.cache.put(key,valuec,ttl) : this.cache.put(key,valuec);
      this.db.save({id:key,timestmp:timestamp,data:valuec,'ttl':ttl});
    }
  },
  
  /**
  * Gets a result from scriptDB if it isn't in cache
  *
  * @param {String, Object} key
  *        Query by id has to be string.
  * @param {Boolean} retrieveLast
  *        to force the return of last value           
  * @return {String}
  */  
  getResultFromDB : function(key,retrieveLast){
    var result = this.db.query({id:key});
    if(result.getSize()>0){
      var current = result.next();
      if(current==null){return null;}
      if(retrieveLast || current.ttl==undefined || (((new Date()).getTime()-(new Date(current.timestmp)).getTime())/1000)<=current.ttl){
        v=current.data;
        this.cache.put(key, v);
        Logger.log(key.replace(this.keyprefix,"") + " from db id");
        return v;
      }
    }
    return null;
  },
  
 /**
  * Gets a key
  *
  * @param {String, Object} key
  *        Query by id has to be string.
  * @param {Boolean} retrieveLast
  *        to force the return of last value           
  * @return {Object,String,Iterator}
  */  
  get : function(key,retrieveLast){
    var v=null, cached=null;

    if(typeof(key)=="string" || !isNaN(key)){
      key = this.keyprefix + key;
    }

    var cached = this.cache.get(key);
       
    if(cached!=null){
      v = cached;
      Logger.log(key.replace(this.keyprefix,"") + " from cache");
    }else{
      Logger.log("trying spplited cache")
      var cont = 0;
      cached = this.cache.get(key + "_" + parseInt(cont));
      Logger.log("trying spplited cache from cache " + key + "_" + parseInt(cont))
      if(cached==null){//retry in scriptdb
        Logger.log("trying spplited cache from db " + key + "_" + parseInt(cont))
        cached = this.getResultFromDB(key + "_" + parseInt(cont), retrieveLast);
      }
      if(cached!=null){ //cache key is splitted due to size limits
        var stb = [];
        while(cached!=null){
          stb.push(cached);
          cont++;
          cached = this.cache.get(key + "_" + cont);
          if(cached==null){//retry in scriptdb
            cached = this.getResultFromDB(key + "_" + cont, retrieveLast);
          }
        }
        Logger.log(key.replace(this.keyprefix,"") + " from cache (splitted)");
        v = stb.join("");
      }else{//db key id
        var result = null;
        if(typeof(key)=="string"){
            v = this.getResultFromDB(key, retrieveLast);
        }else{//query
          Logger.log(JSON.stringify(key) + " from db query");
          var result = this.db.query({data:key});
          return result.getSize()>0?result:null;
        }
      }
    }

    try{
      v = JSON.parse(v);
    }catch(e){
      //...
    }
    return v;
  },
  
 /**
  * Remove contents in cache from a query or key
  * Query by id has to be string.
  *
  * @param {String, Object} q
  */  
  remove : function(q){
    if(typeof(q)=="string"){
      var a=q;
      q={};
      q["id"] = this.keyprefix + a;
    }else{
      q = {data:q};
    }

    var r = this.db.query(q);
    if(r.getSize()>0){
      var c;
      while(r.hasNext()){
        c = r.next();
        this.db.remove(c);
        this.cache.remove(c.id);
        Logger.log("deleting "+c.id.replace(this.keyprefix,""));
      }    
    }else{ //if cache key is splitted
      var cont = 0;
      var r = this.db.query({"id":q["id"]+"_"+cont});
      var c;
      while(r.getSize()>0){
          while(r.hasNext()){
            c = r.next();
            this.db.remove(c);
            this.cache.remove(c.id);
            Logger.log("deleting "+ c.id.replace(this.keyprefix,""));
          }
          cont++;
          r = this.db.query({"id":q["id"]+"_"+cont});
      } 
    }
  }
}