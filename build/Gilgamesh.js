(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var DataSource = require("./DataSource")

function D( name, def ){

  if( def || !this.defs[name]){
    if( this.defs[name] ) console.log( name+" has already defined. we will overwrite it")
    this.defs[name] = new DataSource( name, def||{})
  }

  return this.defs[name]
}

D.prototype.defs = {}


module.exports = D.bind(D.prototype)





},{"./DataSource":4}],2:[function(require,module,exports){
var DataObject = require("./DataObject")
var util = require("./util")



function DataArray(config, context){
  var root = this
  config = config||{}
  context = context||{}

  util.forEach(["$$filled"],function(key){
    root.definePrivateProp(key, false)
  })

  util.forEach(["$$watchers","$$changes","$$actions"],function(key){
    root.definePrivateProp(key, {})
  })

  util.forEach(["$$count","$$limit","$$skip"],function(key){
    //we read 'offset', 'skip' from DataSource.get arguments
    root.definePrivateProp(key, context[key.replace("$$","")] || null)
  })

  root.definePrivateProp("$$config",util.defaults( config,{
    globalWatcherName : "/"
  }))

  root.definePrivateProp("$$unFilledSlices",[])

  root.definePrivateProp("$$context", context)

  root.setArrayProp()
}

DataArray.prototype.setArrayProp = function(){
  var root = this
  //data container
  Object.defineProperty(this, "$$data", {
    enumerable : false,
    configurable: false,
    writable : true,
    value : []
  })
  Object.defineProperty(this, "length", {
    enumerable : false,
    configurable: false,
    get : function(){
      return root.$$data.length
    }
  })
}

DataArray.prototype.definePrivateProp = function( prop, initial ){
  Object.defineProperty(this, prop, {
    enumerable : false,
    configurable: false,
    writable : true,
    value : initial
  })
}

//may used as  refresh
DataArray.prototype.get = function( params, append ){
  this.changePropAndNotify("$$filled", false)
  this.$$config.dataSource.get( params === true ? util.extend(this.$$context,append||{}) : params, this)
}

/**
 *
 * @param obj  Acceptable data structure : {data:[],context:{skip,offset,count}}
 * @returns {DataArray}
 */
DataArray.prototype.set = function( obj ){
  var root = this
  if(util.isArray(obj)){
    obj = {data:obj,context:{}}
  }
  root.setData( obj.data )
  root.setContext( obj.context)
  this.changePropAndNotify("$$filled",true)
  return this
}


DataArray.prototype.setData = function( data ){
  this.$$data = data
  var root = this
  var i = 0, length = Math.max(data.length, this.$$data.length)
  //delete useless indexes
  while( i<length ){
    if( root[i] ) delete root[i]
    root.setItem( i, data[i])
    i++
  }
}

DataArray.prototype.setItem = function( index, initial ){
  var root = this
  Object.defineProperty(root,index, {
    configurable : true,
    enumerable : true,
    get : function(){
      return root.$$data[index]
    },
    set : function( dataToSet ){
      var wrappedData
      if( ! (dataToSet instanceof  DataObject)){
        wrappedData = new DataObject(root.$$config)
        wrappedData.set(dataToSet)
      }else{
        wrappedData = dataToSet
      }
      root.$$data[index] = wrappedData
    }
  })
  root[index] = initial
}

DataArray.prototype.setContext = function( context ){
  var root = this
  for( var key in context ){
    var privateKey = "$$"+key
    if(root[privateKey]===undefined){
      root.definePrivateProp(privateKey, context[key])
    }else{
      root[privateKey] =context[key]
    }
  }
}


//watcher related mixin from DataObject
DataArray.prototype.onStatus = DataArray.prototype.watch = DataObject.prototype.onStatus
DataArray.prototype.changePropAndNotify = DataObject.prototype.changePropAndNotify
DataArray.prototype.dispatchChange= DataObject.prototype.dispatchChange
DataArray.prototype.notify= DataObject.prototype.notify

//actions
DataArray.prototype.invokeDataSourceMethod = DataObject.prototype.invokeDataSourceMethod
DataArray.prototype.action = DataObject.prototype.action
DataArray.prototype.singular = function( item ){
  return this.invokeDataSourceMethod("singular",item)
}


//map array methods
util.forEach(["push","pop","shift","unshift","slice","splice","forEach"],function( method){
  DataArray.prototype[method] = function(){
    this.$$data[method].apply(this.$$data, arguments)
    this.setData(this.$$data)
  }
})

DataArray.prototype.pluck = function( attr ){
  return util.pluck( this.$$data, attr)
}

DataArray.prototype.filter = function( attr, filterDef ){
  var filterFn = filterDef
  var root = this

  if( !( filterFn instanceof Function) ){
    filterFn = function( item ){
      return util.isArray( filterDef ) ? (filterDef.indexOf(item[attr])!==-1) : (item[attr] === filterDef)
    }
  }

  var slice = new DataArray( this.$$config, this.$$context)

  if( this.$$filled ){
    slice.set( root.$$data.filter( filterFn ) )
  }else{
    root.$$unFilledSlices.push( slice )
    root.onStatus("$$filled", function(filled){
      if( filled ){
        root.$$unFilledSlices.forEach(function(slice){
          slice.set( root.$$data.filter( filterFn ) )
        })
      }
    })
  }


  return slice
}


module.exports = DataArray
},{"./DataObject":3,"./util":7}],3:[function(require,module,exports){
var util = require("./util.js")

//utilities

function setRef( obj, attr, data){
  return (new Function("obj","data","return obj."+attr +"=data"))(obj,  data)
}

function getRef(obj, attr){
  return (new Function("obj","data","return obj."+attr ))(obj)
}


function DataObject( config ){
  var root = this

  util.forEach(["$$dirty","$$filled","$$validated", "$$empty", "$$validating", "$$saving" , "$$saved","$$deleting","$$deleted"],function(key){
    root.definePrivateProp(key, false)
  })

  util.forEach(["$$watchers","$$changes","$$actions"],function(key){
    root.definePrivateProp(key, {})
  })

  root.definePrivateProp("$$config",util.defaults( config,{
    globalWatcherName : "/"
  }))
}


DataObject.prototype.set =function(obj){
  util.extend( this, obj )
  this.changePropAndNotify("$$filled",true)
  return this
}

DataObject.prototype.definePrivateProp = function( prop, initial ){
  Object.defineProperty(this, prop, {
    value: initial,
    enumerable : false,
    writable: true,
    configurable: false
  })
}

DataObject.prototype.changePropAndNotify = function( prop, val ){
  var oldValue = getRef(this,prop)
  setRef(this,prop,val)

  this.dispatchChange({name:prop,oldValue:oldValue},prop)
  //notify all global listener
  this.dispatchChange( {name:prop,oldValue:oldValue}, this.$$config.globalWatcherName )
}

DataObject.prototype.toObject = function(){
  var obj = {}
  for( var i in this ){
    if( this.hasOwnProperty(i)){
      obj[i] = util.cloneDeep( this[i] )
    }
  }
  return obj
}

/*
 * instance methods
 */
DataObject.prototype.invokeDataSourceMethod = function( method ){
  var args = util.toArray(arguments).slice(1)
  if( !this.$$config.dataSource[method] ) return  console.log( "DataSource method", method, "not passed in")

  return this.$$config.dataSource[method].apply( this.$$config.dataSource, args)
}

DataObject.prototype.publish = function( name){
  //return this.invokeDataSourceMethod("publish", this, name)
  var data = this.invokeDataSourceMethod("publish", this, name)
  return data
}


DataObject.prototype.action = function( action ){
  var root = this
  return function( params ){
    root.changePropAndNotify("$$actions."+action, "executing")
    return root.invokeDataSourceMethod("action", action)(root, params).then(function(){
      root.changePropAndNotify("$$actions."+action, "succeed")
    },function(){
      root.changePropAndNotify("$$actions."+action, "failed")
    })
  }
}

//quick methods
DataObject.prototype.save = function(params){
  return this.action("save")(params)
}

DataObject.prototype.delete = function(){
  return this.action("delete")()
}

//may used as  refresh
DataObject.prototype.get = function( params ){
  this.changePropAndNotify("$$filled", false)

  if( params === true ){
    params = {}
    params[this.$$config.dataSource.pk] = this[this.$$config.dataSource.pk]
  }
  console.log("regeting", params)
  this.$$config.dataSource.get( params, this)
}


/*
 * status watchers
 */
DataObject.prototype.watch = function( name, handler ){
  if(util.isFunction(name) ){
    handler = name
    name = this.$$config.globalWatcherName
  }
  this.$$watchers[name] ?  this.$$watchers[name].push(handler) : (this.$$watchers[name] = [handler])
}

//TODO unwatch

//make it readable for status
DataObject.prototype.onStatus = DataObject.prototype.watch


//only save the last change attribute per attribute, when notify
//called, all changes will be cleared
DataObject.prototype.saveChanges = function( change ){
  this.$$changes[change.name] = change
}

//change : {name, obj, type, oldValue}
DataObject.prototype.notify = function(){
  var root = this
  util.forEach(root.$$changes, function( change, prop ){
      root.dispatchChange( change, prop)
      delete root.$$changes[change.name]

    //notify all listeners listened on whole object
    root.dispatchChange( change, root.$$config.globalWatcherName )
  })


}

DataObject.prototype.dispatchChange = function( change, prop){
  var root = this

  root.$$watchers[prop] && root.$$watchers[prop].forEach(function( handler ) {
    //TODO should change pop up?
    handler( getRef(root,change.name), change.oldValue, change)
  })
}


module.exports = DataObject
},{"./util.js":7}],4:[function(require,module,exports){
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
},{"./DataArray":2,"./DataObject.js":3,"./util.js":7}],5:[function(require,module,exports){
module.exports = function(id){
  return document.querySelector("#"+id)
}

},{}],6:[function(require,module,exports){
(function( global ){
  var D = require("./D.js")
  global.D = D.bind( D.prototype )
  global.DataSource = require("./DataSource")
  global.E = require("./Element.js")
})(window||this)
},{"./D.js":1,"./DataSource":4,"./Element.js":5}],7:[function(require,module,exports){
var util = {
  forEach : function( arr, cb ){
    return arr.forEach(cb)
  },
  defaults : function( target, defaults){
    for( var i in defaults ){
      if( target[i] === undefined ) target[i] = defaults[i]
    }
    return target
  },
  isArray : function( obj ){
    return Object.prototype.toString.call(obj) === "[object Array]"
  },
  isFunction : function(obj){
    return Object.prototype.toString.call(obj) === "[object Function]"
  },
  isObject : function( obj ){
    return typeof obj == "object"
  },
  isUndefined : function( obj ){
    return obj === undefined
  },
  inArray : function( i, arr ){
    return arr.indexOf(i) !== -1
  },
  difference : function( target, toDiff){
    var root = this
    return target.filter(function(v){
      return !root.inArray( v, toDiff)
    })
  },
  pluck : function( arr, attr){
    return arr.map(function(v){return v[attr]}).filter(function(v){return v!==undefined})
  },
  extend:function( target, source){
    for( var i in source ){
      if( source.hasOwnProperty(i) ){
        target[i] = source[i]
      }
    }
    return target
  },
  forOwn : function( obj, cb ){
    for( var i in obj ){
      if( obj.hasOwnProperty(i) ){
        cb( obj[i], i )
      }
    }
  },
  clone : function(source, handler){
    var o = util.isArray(source ) ? [] : {}
    this.forOwn(source, function(v,k){
      var r
      if( handler ) r = handler(v,k )
      o[k] = (r ===undefined) ? v : r
    })
    return o
  },
  cloneDeep:function( source, handler ){
    var root = this
    return root.isObject(source) ?  this.clone( source, function( v, k){
      var r
      if( handler ) r = handler(v,k )
      return (r ===undefined) ? root.cloneDeep(v, handler) : r
    }) : source
  },
  toArray:function( arrLike){
    return Array.prototype.slice.call(arrLike)
  },
  zipObject : function(keys, values){

    var o = {}
    keys.forEach(function(key, i){
      o[key] = values[i]
    })
    return o
  }
}

module.exports = util
},{}]},{},[6])