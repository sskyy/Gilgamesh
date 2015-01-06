var DataObject = require("./DataObject")
var _ = require("../libs/lodash.min.js")

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
  //console.log( method)
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