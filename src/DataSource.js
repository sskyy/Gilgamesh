var util = require("./util.js")
var DataObject  = require("./DataObject.js")
var DataArray = require("./DataArray")
//var $ = require("../libs/jquery-1.11.1.min.js")

function DataSource( name, def ){
  //caution, cloneDeep may change function to object if not using custom callback

  var config =  util.cloneDeep( DataSource.prototype.config )
  util.extend( this, util.merge( config, def ) )
  this.name = name
}

//allow overwrite
DataSource.prototype.config = {
    url : {
      base : "",
      collection : function(name){return "/" + name+"/{action}"},
      single: function(name){return "/" + name+"/{id}/{action}"}
    },
    pk : "id", //TODO allow array
    publicDataSources : {},
    publicDataSourceProxies : {},
    actions : {
      save : function( instance, params, dataSource ){
        return {
          url : dataSource.makeUrl( {id:instance.id} ),
          method : util.isUndefined( instance[dataSource.pk] ) ? "POST" : "PUT",
          data : util.extend( instance.toObject(), params)
        }
      },
      delete: function( instance, params, dataSource ){
        return {
          url : dataSource.makeUrl( {id:instance.id} ) ,
          method : "DELETE",
          data : params
        }
      }
    },
    singular : function( item, doNotWatch ){
      if( !doNotWatch){
        item.$$collection.watchItem( item )
      }
      return item
    },
    interceptors : {
      "get" : [],
      "query" : [],
      "parse" : [],
      "action" : {

      }
    }
  }

DataSource.prototype.query = function( settings ){
  var queryInterceptors = [].concat( this.interceptors.query)
  queryInterceptors.forEach(function(interceptor){
    interceptor( settings )
  })
  return $.ajax(settings)
}

DataSource.prototype.parse = function( data ){
  return data
}

DataSource.prototype.interpolate = function( text, obj ){
  return text.replace(/(\{\w+\})/g, function( m ){ return obj[m.slice(1,m.length-1)] || "" })
}

DataSource.prototype.makeUrl = function( params ){
  var url = (this.url.base +
    util.result(
      this.hasPrimaryKey(params )
        ? this.url.single
        : this.url.collection,
      this.name,
      params
    ))

  return this.interpolate( url, params).replace(/\/+\s*$/,"").replace(/\/{2,}/,"/")
}


DataSource.prototype.hasPrimaryKey = function( params ){
  return !util.isObject( params ) || util.difference( [].concat(this.pk),  Object.keys(params)).length == 0
}


//we need to extract primary key from params
DataSource.prototype.makeQuery = function( params){
  var result = util.clone(util.isObject(params)?params:{})
  util.forEach([].concat(this.pk), function(r){
      delete result[r]
    })
  return result
}

DataSource.prototype.makeData = function( data ){
  var result = util.cloneDeep(data)
  util.forEach(result, function(v, k){
    if(util.isFunction(v) || /^\$\$/.test(k) ) delete result[k]
  })
  return result
}



DataSource.prototype.get = function( params, instanceOrCollection ){
  params = params ? (util.isObject(params) ? params : util.zipObject([this.pk],[params]) ) : {}
  var root = this
  var config = {dataSource:root}
  if( !instanceOrCollection ){
    instanceOrCollection = this.hasPrimaryKey(params) ? new DataObject(config) : new DataArray(config, params)
  }

  var settings = {url:this.makeUrl(params),type:"GET",data:this.makeQuery(params)}
  var isSingle = root.hasPrimaryKey(params)

  var getInterceptors = [].concat( root.interceptors.get )
  getInterceptors.forEach(function(interceptor){
    interceptor( settings, isSingle )
  })

  this.query( settings  ).then(function( res ){
    var parseInterceptors = [].concat( root.interceptors.parse )
    parseInterceptors.forEach(function(interceptor){
      res = interceptor( res, isSingle, settings )
    })

    instanceOrCollection.set( res )
  })

  return instanceOrCollection
}

DataSource.prototype.new = function( data ){
  var object = new DataObject({dataSource:this})
  object.definePrivateProp("$$new", true)
  if( data ) object.set(data)
  return object
}

DataSource.prototype.newArray = function( data, params ){
  var object = new DataArray({dataSource:this}, params||{})
  object.definePrivateProp("$$new", true)

  if( data ){
    if( util.isFunction(data.then) ){
      //promise
      data.then(function( resolvedData ){
        object.set( resolvedData )
      })
    }else{
      object.set(data)
    }
  }
  return object
}

DataSource.prototype.recycle = function( name ){
  if( this.publicDataSources[name] ) delete this.publicDataSources[name]
  if( this.publicDataSourceProxies[name] ) this.publicDataSourceProxies[name].destroy()
}

DataSource.prototype.publish = function( instance, name ){
  if( !instance  ){
    throw new Error("cannot publish undefined", name)
  }

  this.publicDataSources[name] = instance

  if( this.publicDataSourceProxies[name] ){
    this.makePublicProxy( name, instance, this.publicDataSourceProxies[name] )
  }else{
    this.publicDataSourceProxies[name] = this.makePublicProxy( name, instance )
  }

  console.log("publishing",this.publicDataSourceProxies[name])
  return this.publicDataSourceProxies[name]
}

DataSource.prototype.makePublicProxy = function( name, instance, proxy ){
  var root =this

  if( !proxy ){
    if( instance instanceof DataObject || util.isNaiveObject(instance) ){
      proxy = new DataObject({dataSource:this})
    }else{
      proxy = new DataArray({dataSource:this})
    }
  }

  if( proxy.$$filled ){
    if( proxy instanceof DataArray ){
      proxy.splice(0)
    }else{
      for( var i in proxy ){
        delete proxy[i]
      }
    }
  }

  if( proxy instanceof DataArray ){
    var _proxy = []
    root.defineProxyProperties(name, instance, _proxy)
    proxy.set(_proxy)
  }else{
    root.defineProxyProperties(name, instance, proxy)
  }

  proxy.changePropAndNotify("$$filled",true)

  return proxy
}

DataSource.prototype.defineProxyProperties = function( name, instance , proxy){
  var root = this
  util.forOwn( instance, function( value, i){
    if( typeof instance[i] !== "function"){
      Object.defineProperty( proxy, i, {
        enumerable : true,
        configurable: true,
        get : function(){
          return root.publicDataSources[name][i]
        },
        set : function( newValue ){
          root.publicDataSources[name][i] = newValue
          return newValue
        }
      })
    }
  })
  return proxy
}


DataSource.prototype.receive = function(name){
  return this.publicDataSourceProxies[name]
}

DataSource.prototype.receiveObject = function(name){
  if( !this.publicDataSourceProxies[name] ){
    this.publicDataSourceProxies[name]  = new DataObject({dataSource:this})
  }

  return this.publicDataSourceProxies[name]
}

DataSource.prototype.receiveArray = function(name){
  var obj
  if( this.publicDataSourceProxies[name] ){
    obj =  this.publicDataSourceProxies[name]
  }else{
    this.publicDataSourceProxies[name] = obj = new DataArray({dataSource:this})
  }

  return obj
}

DataSource.prototype.generateAction = function( action ){
  var root = this
  return function( instanceOrCollections, params ){
    var def = util.isFunction(root.actions[action]) ?
      root.actions[action](instanceOrCollections,params,root) :
        util.isObject( root.actions[action] ) ?
          root.actions[action] :  {}


    var isBatch = instanceOrCollections instanceof DataArray
    var settings = util.defaults( def ||{}, {
      url : root.makeUrl({id:instanceOrCollections.id,action:action}),
      method : "PUT",
      data :  util.extend( isBatch? util.zipObject([root.pk], [instanceOrCollections.pluck("id") ]):{}, params)
    })


    return root.query(settings).then(function( res ){
      if( root.interceptors.action[action] ){
        root.interceptors.action[action].forEach(function(interceptor){
          res = interceptor(res, settings)
        })
      }
      return res
    })
  }
}

DataSource.prototype.action = function( action, defFn ){
  if( defFn ){
    this.actions[action] = defFn
  }
  return this.generateAction(action).bind(this)
}



DataSource.prototype.save = function( instance){
  return this.action("save")(instance)
}

DataSource.prototype.delete = function( instance){
  return this.action("delete")(instance)
}

module.exports = DataSource