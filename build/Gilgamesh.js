(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var DataSource = require("./DataSource")

function D( name, def ){
  if( def || !this.defs[name] ){
    this.defs[name] = new DataSource( name, def||{})
  }
  return this.defs[name]
}

D.prototype = {
  defs : {}
}

module.exports = D.bind( D.prototype )






},{"./DataSource":4}],2:[function(require,module,exports){
var DataObject = require("./DataObject")
//var _ = require("../libs/lodash.min.js")

function DataArray(config, context){
  var root = this
  _.forEach(["$$filled"],function(key){
    root.definePrivateProp(key, false)
  })

  _.forEach(["$$watchers","$$changes","$$actions"],function(key){
    root.definePrivateProp(key, {})
  })

  _.forEach(["$$count","$$offset","$$skip"],function(key){
    //we read 'offset', 'skip' from DataSource.get arguments
    root.definePrivateProp(key, context[key.replace("$$","")] || null)
  })

  root.definePrivateProp("$$config",_.defaults( config,{
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

/**
 *
 * @param obj  Acceptable data structure : {data:[],context:{skip,offset,count}}
 * @returns {DataArray}
 */
DataArray.prototype.set = function( obj ){
  var root = this
  if(_.isArray(obj)){
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
  var indexToDelete = _.difference( Object.keys(root), Object.keys(data))
  for( var index in data){
    root.setItem( index, data[index])
  }
  //delete useless indexes
  for( var dIndex in indexToDelete ){
    delete root[dIndex]
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
    if(_.isUndefined(root[privateKey])){
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
DataArray.prototype.action = function( action ){
  var root = this
  return function( params ){
    root.$$actions[action] = "executing"
    return root.invokeDataSourceMethod("action", action)(root, params).then(function(){
      root.$$actions[action] = "completed"
    })
  }
}

//map array methods
_.forEach(["push","pop","shift","unshift","slice","splice","forEach"]).forEach(function( method){
  DataArray.prototype[method] = function(){
    this.$$data[method].apply(this.$$data, arguments)
    this.setData(this.$$data)
  }
})

DataArray.prototype.pluck = function( attr ){
  return _.pluck( this.$$data, attr)
}

DataArray.prototype.filter = function( attr, filterDef ){
  var filterFn = filterDef
  var root = this

  if( !_.isFunction( filterFn ) ){
    filterFn = function( item ){
      return _.isArray( filterDef ) ? (filterDef.indexOf(item[attr])!==-1) : (item[attr] === filterDef)
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
},{"./DataObject":3}],3:[function(require,module,exports){
//var _ = require("lodash")

//utilities

function setRef( obj, attr, data){
  return (new Function("obj","data","return obj."+attr +"=data"))(obj,  data)
}

function getRef(obj, attr){
  return (new Function("obj","data","return obj."+attr ))(obj)
}


function DataObject( config ){
  var root = this

  _.forEach(["$$dirty","$$filled","$$validated", "$$empty", "$$validating", "$$saving" , "$$saved","$$deleting","$$deleted"],function(key){
    root.definePrivateProp(key, false)
  })

  _.forEach(["$$watchers","$$changes","$$actions"],function(key){
    root.definePrivateProp(key, {})
  })

  root.definePrivateProp("$$config",_.defaults( config,{
    globalWatcherName : "/"
  }))
}


DataObject.prototype.set =function(obj){
  _.extend( this, obj )
  this.changePropAndNotify("$$filled",true)
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
      obj[i] = _.cloneDeep( this[i] )
    }
  }
  return obj
}

/*
 * instance methods
 */
DataObject.prototype.invokeDataSourceMethod = function( method ){
  var args = _.toArray(arguments).slice(1)
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
      root.changePropAndNotify("$$actions."+action, "completed")
6    })
  }
}

//quick methods
DataObject.prototype.save = function(){
  return this.action("save")()
}

DataObject.prototype.delete = function(){
  return this.action("delete")
}



/*
 * status watchers
 */
DataObject.prototype.watch = function( name, handler ){
  if(_.isFunction(name) ){
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
  _.forEach(root.$$changes, function( change, prop ){
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
},{}],4:[function(require,module,exports){
//var _  = require("../libs/lodash.min.js")
var DataObject  = require("./DataObject.js")
var DataArray = require("./DataArray")
//var $ = require("../libs/jquery-1.11.1.min.js")

function DataSource( name, def ){
  _.extend( this, _.merge({
    url : {
      collection : "/" + name+"/{action}",
      single: "/" + name+"/{id}/{action}"
    },
    pk : "id", //TODO allow array
    publicDataSources : {},
    actions : {
      save : function( instance, params, dataSource ){
        return {
          url : dataSource.makeUrl( {id:instance.id} ),
          method : _.isUndefined( instance[dataSource.pk] ) ? "POST" : "PUT",
          data : instance.toObject()
        }
      },
      delete: function( instance,params, dataSource ){
        return {
          url : dataSource.makeUrl( {id:instance.id} ),
          method : _.isUndefined( instance[dataSource.pk] ) ? "POST" : "PUT",
          data : instance.toObject()
        }
      }

    }
  },def))
}



DataSource.prototype.query = function( settings ){
  return $.ajax(settings)
}

DataSource.prototype.parse = function( data ){
  return data
}

DataSource.prototype.interpolate = function( text, obj ){
  return text.replace(/(\{\w+\})/g, function( m ){ return obj[m.slice(1,m.length-1)] || "" })
}

DataSource.prototype.makeUrl = function( params ){
  return this.interpolate( this.hasPrimaryKey(params )? this.url.single : this.url.collection, params).replace(/\/*\s*$/,"")
}


DataSource.prototype.hasPrimaryKey = function( params ){
  return !_.isObject( params ) || _.difference( [].concat(this.pk),  Object.keys(params)).length == 0
}


//we need to extract primary key from params
DataSource.prototype.makeQuery = function( params){
  var result = _.clone(_.isObject(params)?params:{})
  _.forEach([].concat(this.pk), function(r){
      delete result[r]
    })
  return result
}

DataSource.prototype.makeData = function( data ){
  var result = _.cloneDeep(data)
  _.forEach(result, function(v, k){
    if(_.isFunction(v) || /^\$\$/.test(k) ) delete result[k]
  })
  return result
}


DataSource.prototype.publish = function( instance, name ){
  this.publicDataSources[name] = instance
  return instance
}

DataSource.prototype.get = function( params ){
  params = params ? (_.isObject(params) ? params : _.zipObject([this.pk],[params]) ) : {}
  var root = this
  var config = {dataSource:root}
  var result = this.hasPrimaryKey(params) ? new DataObject(config) : new DataArray(config, params)

  this.query( {url:this.makeUrl(params),type:"GET",data:this.makeQuery(params)} ).then(function( res ){
    result.set( root.parse( res, root.hasPrimaryKey(params) ) )
  })

  return result
}

DataSource.prototype.new = function(){
  return new DataObject({dataSource:this})
}


DataSource.prototype.receive = function(name){
  return this.publicDataSources[name]
}

DataSource.prototype.generateAction = function( action ){
  var root = this
  return function( instanceOrCollections, params ){
    var def = _.isFunction(root.actions[action]) ?
      root.actions[action](instanceOrCollections,params,root) :
        _.isObject( root.actions[action] ) ?
          root.actions[action] :  {}


    var isBatch = instanceOrCollections instanceof DataArray

    return root.query(_.defaults( def , {
      url : root.interpolate(root.url[isBatch?"collection":"single"] ,{id:instanceOrCollections.id,action:action}),
      method : "PUT",
      data : _.extend( isBatch? _.zipObject([root.pk, instanceOrCollections.pluck("id") ]):{}, params)
    }))
  }
}

DataSource.prototype.action = function( action, defFn ){
  if( defFn ){
    this.actions[action] = defFn
  }
  return this.generateAction(action).bind(this)
}



DataObject.prototype.save = function( instance){
  return this.action("save")(instance)
}

DataObject.prototype.delete = function( instance){
  return this.action("delete")(instance)
}

module.exports = DataSource
},{"./DataArray":2,"./DataObject.js":3}],5:[function(require,module,exports){
module.exports = function(id){
  return document.querySelector("#"+id)
}

},{}],6:[function(require,module,exports){
(function( global ){
  global.D = require("./D.js")
  global.E = require("./Element.js")
})(window||this)
},{"./D.js":1,"./Element.js":5}]},{},[6])