var util = require("./util.js")
var DataObject  = require("./DataObject.js")
var DataArray = require("./DataArray")
//var $ = require("../libs/jquery-1.11.1.min.js")

function DataSource( name, def ){
  //caution, cloneDeep may change function to object if not using custom callback


  util.extend( this, util.defaults( def||{}, util.cloneDeep( this.globalConfig, function(v){
    if( v instanceof Function ){
      return v
    }
  })))



  if( this.url.collection instanceof Function){
    this.url.collection = this.url.collection(name)
  }
  if( this.url.single instanceof Function){
    this.url.single = this.url.single(name)
  }


}

//allow overwrite
DataSource.prototype.globalConfig = {
    url : {
      base : "",
      collection : function(name){return "/" + name+"/{action}"},
      single: function(name){return "/" + name+"/{id}/{action}"}
    },
    pk : "id", //TODO allow array
    publicDataSources : {},
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
    singular : function( item ){
      return item
    },
    interceptors : {
      "get" : [],
      "query" : [],
      "parse" : []
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
  return this.interpolate( this.url.base + (this.hasPrimaryKey(params )? this.url.single : this.url.collection), params).replace(/\/*\s*$/,"")
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
      res = interceptor( res, isSingle )
    })

    instanceOrCollection.set( res )
  })

  return instanceOrCollection
}

DataSource.prototype.new = function(){
  return new DataObject({dataSource:this})
}

DataSource.prototype.publish = function( instance, name ){
  if( this.publicDataSources[name] ){
    //Todo, make it proxy to instance.
    this.publicDataSources[name].set( instance.$$data || instance.toObject() )
  }else{
    this.publicDataSources[name] = instance
  }

  return this.publicDataSources[name]
}


DataSource.prototype.receive = function(name){
  return this.publicDataSources[name]
}

DataSource.prototype.receiveObject = function(name){
  if( !this.publicDataSources[name] ){
    this.publicDataSources[name]  = new DataObject({dataSource:this})
  }

  return this.publicDataSources[name]
}

DataSource.prototype.receiveArray = function(name){
  var obj
  if( this.publicDataSources[name] ){
    obj =  this.publicDataSources[name]
  }else{
    this.publicDataSources[name] = obj = new DataArray({dataSource:this})
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

    return root.query(util.defaults( def , {
      url : root.interpolate(root.url[isBatch?"collection":"single"] ,{id:instanceOrCollections.id,action:action}),
      method : "PUT",
      data : util.extend( isBatch? util.zipObject([root.pk], [instanceOrCollections.pluck("id") ]):{}, params)
    }))
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