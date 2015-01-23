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

  root.definePrivateProp("$$unFilledSliceFns",[])
  root.onStatus("$$filled", function(filled){
    if( filled ){
      root.$$unFilledSliceFns.forEach(function(sliceFn){
        sliceFn( root.$$data )
      })
      root.$$unFilledSlices = []
    }
  })


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

DataArray.prototype.empty = function(){

}


DataArray.prototype.setData = function( data ){
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
        wrappedData = generateObject( dataToSet, root)
      }else{
        wrappedData = dataToSet
      }
      root.$$data[index] = wrappedData
    }
  })

  function generateObject( dataToSet, root){
    var wrappedData
    wrappedData = new DataObject(root.$$config)
    wrappedData.set(dataToSet )
    wrappedData.definePrivateProp("$$collection", root)
    return wrappedData
  }
  root[index] = generateObject( initial, root)
}

DataArray.prototype.watchItem = function( item, index ){
  var root = this
  //add action listener
  item.onStatus(function(v,o,change){
    if( /\$\$actions\.\w+/.test(change.name) ){
      root.dispatchChange(util.extend(util.cloneDeep(change),{name:index+"."+change.name}) , root.$$config.globalWatcherName )
    }
  })

  return item
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

//publish and receive
DataArray.prototype.publish = DataObject.prototype.publish
DataArray.prototype.receive = DataObject.prototype.receive
DataArray.prototype.receiveObject = DataObject.prototype.receiveObject
DataArray.prototype.receiveArray = DataObject.prototype.receiveArray


//map array methods
util.forEach(["forEach","indexOf"],function( method){
  DataArray.prototype[method] = function(){
    var result = this.$$data[method].apply(this.$$data, arguments)
    return result
  }
})

util.forEach(["push","pop","shift","unshift","splice"],function( method){
  DataArray.prototype[method] = function(){
    var result = this.$$data[method].apply(this.$$data, arguments)

    this.setData(this.$$data)
    return result
  }
})

util.forEach(['slice','map'], function( method ){
  DataArray.prototype[method] = function(){

    var slice = new DataArray( this.$$config, this.$$context)
    var root = this
    var args = Array.prototype.slice.call(arguments)

    if( this.$$filled ){
      slice.set( root.$$data[method].apply( root.$$data, args ) )
    }else{
      root.$$unFilledSliceFns.push( function( data ){
        slice.set( data[method].apply( data, args ) )
      })
    }

    return slice
  }
})

DataArray.prototype.pluck = function( attr ){
  return util.pluck( this.$$data, attr)
}

DataArray.prototype.filter = function( attr, filterDef ){
  var filterFn = attr
  var root = this

  if( !( filterFn instanceof Function) ){
    filterFn = function( item ){
      if( typeof attr== 'string'){
        return util.isArray( filterDef ) ? (filterDef.indexOf(item[attr]) !== -1)  : (item[attr] === filterDef)
      }else if( util.isObject( attr ) ){
        return
      }else{
        throw new Error("unrecognized filter")
      }
    }
  }

  var slice = new DataArray( this.$$config, this.$$context)

  if( this.$$filled ){
    slice.set( root.$$data.filter( filterFn ) )
  }else{
    root.$$unFilledSliceFns.push( function( data  ){
      slice.set( data.filter( filterFn )  )
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

  this.dispatchChange({value: getRef( this,prop), name:prop,oldValue:oldValue},prop)
  //notify all global listener
  this.dispatchChange( {value: getRef( this,prop), name:prop,oldValue:oldValue}, this.$$config.globalWatcherName )
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
  return this.invokeDataSourceMethod("publish", this, name)
}

DataObject.prototype.receiveObject = function( name){
  return this.invokeDataSourceMethod("receiveObject", name)
}

DataObject.prototype.receive = function( name){
  return this.invokeDataSourceMethod("receive", name)
}

DataObject.prototype.receiveArray = function( name){
  return this.invokeDataSourceMethod("receiveArray",  name)
}

DataObject.prototype.singular = function( doNotWatch ){
  //return this.invokeDataSourceMethod("publish", this, name)
  return this.invokeDataSourceMethod("singular", this, doNotWatch )
}


DataObject.prototype.action = function( action ){
  var root = this
  return function( params ){
    root.changePropAndNotify("$$actions."+action, "executing")
    return root.invokeDataSourceMethod("action", action)(root, params).then(function(res){
      root.changePropAndNotify("$$actions."+action, "succeed")
      return res
    },function(res){
      root.changePropAndNotify("$$actions."+action, "failed")
      return res
    })
  }
}

DataObject.prototype.clone = function(){
  return this.$$config.dataSource.new( this.toObject() )
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
    handler( change.value , change.oldValue, change)
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
  for( var i in instance ){
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
  }
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

  isArray : function( obj ){
    return Object.prototype.toString.call(obj) === "[object Array]"
  },
  isFunction : function(obj){
    return Object.prototype.toString.call(obj) === "[object Function]"
  },
  isObject : function( obj ){
    return typeof obj == "object"
  },
  isPlainObject : function(){
    return Object.prototype.toString.call(obj) === "[object Object]"
  },
  isNaiveObject : function(obj){
    return (typeof obj == "object")&& !util.isArray(obj)
  } ,
  isUndefined : function( obj ){
    return obj === undefined
  },
  inArray : function( i, arr ){
    return arr.indexOf(i) !== -1
  },
  forEach : function( arr, cb ){
    return arr.forEach(cb)
  },
  defaults : function( target, defaults, deep){
    for( var i in defaults ){
      if( target[i] === undefined ){
        target[i] = defaults[i]
      }else if( deep && util.isNaiveObject(target) && util.isNaiveObject(defaults) ){
        util.defaults( target[i], defaults[i] )
      }
    }
    return target
  },
  difference : function( target, toDiff){
    return target.filter(function(v){
      return !util.inArray( v, toDiff)
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
  merge : function( target, source, mergeArray ){
    for( var i in source ){
      if( util.isNaiveObject(target[i]) && util.isNaiveObject(source[i])){
        util.merge( target[i], source[i])
      }else if( mergeArray && util.isArray(target[i]) && util.isArray(source[i])){
        target[i] = target[i].concat( source[i])
      }else{
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
    util.forOwn(source, function(v,k){
      var r
      if( handler ) r = handler(v,k )
      o[k] = (r ===undefined) ? v : r
    })
    return o
  },
  cloneDeep:function( source, handler ){
    return util.isObject(source) ?  util.clone( source, function( v, k){
      var r
      if( handler ) r = handler(v,k )
      return (r ===undefined) ? util.cloneDeep(v, handler) : r
    }) : source
  },
  partialRight : function(fn){
    var partialArgs = Array.prototype.slice.call( arguments, 1 )
    return function(){
      var args = Array.prototype.slice.call( arguments).concat( partialArgs )
      return fn.apply( fn, args)
    }
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
  },
  result : function( fn ){
    if( util.isFunction(fn) ){
      return fn.apply( fn, Array.prototype.slice.call(arguments,1) )
    }else{
      return fn
    }
  }

}

module.exports = util
},{}]},{},[6])