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