# Gilgamesh

## Usage

### Data Source

#### 1. Get a list

```
D("user").get()                    //get user list
D("user").get({name:"Gilgamesh"})  //get user list with parameters
```

#### 2. Get a certain object

```
//id can be replace by any name you defined as primary key
D("user").get({id:1})  
D("user").get(1) 
```

#### 3. Create a new object and save it

```
var newUser = D("user").new()
newUser.name = "me"
newUser.save()
```

#### 4. Publish data with a name

```
D("user").get(id).publish("global.user")
D("user").receive("global.user")
```

#### 5. Available data status and methods

```
$$valid     //need method validate implemented
$$dirty		//is data changed?
$$empty		//is data equal to undefined, null, or "".
$$validating
$$validated
$$saving
$$saved
```

```
.validate()  					//need to be validate manually
.delete()
.save()
.watch("attribute", callback)  //watch certain attribute
.watch(callback)				//watch object
.notify()						//manualy call watch callbacks
```

### Element

#### 1. Use it with Data Source


	<div gm-data="D('user').get(1) as user">
		name   : <input type="text" ng-model="user.name">
		gender : <input type="text" ng-model="user.gender">
		<button ng-click="user.save()">save</button>
	</div>

#### 2. Use template overwrite

First, use `gmDirective` instead of `directive`:

```
.gmDirective("userCardForm", function(){
    return {
      //require : "gmSource",
      priority : 98,
      template:
      '	   <div gm-role="input">'+
      '    		<input type="text" ng-model="user.name">'+
      '    		<input type="text" ng-model="user.gender">'+
      '	   </div>'+
      '    <button gm-role="save" ng-click="user.save()">save</button>'
      link : function( $scope, $el, $attrs){
        console.log("watch $$saved")
          $scope.user.watch("$$saved", function( saved ){
            if( saved ){
              try{
                if($el.attr('onSubmit') ) (new Function( $el.attr('onSubmit')))()
                console.log( $el.attr('onSubmit'))
                console.log( "on submit", saved)

              }catch(e){
                console.log( e )
              }
            }
          })
      }
    }
  })
```

Secondly, overwrite template with child element:

	<div user-card-form gm-data="D('user').new() as user">
        name : <input type="text" ng-model="user.name">
        gender : <input type="text" ng-model="user.gender">
        <button role="save" ng-click="user.save()">save</button>
        <div>saving : {{user.$$saving}}</div>
        <div>saved : {{user.$$saved}}</div>
    </div>

#### 3. Overwrite part of template

As you may notice that a extra attribute `gm-role` was added to child element of directive `user-card-form`. We can do partial overwriting with `gm-tpl` set to `include`:


	<div user-card-form gm-tpl-include gm-data="D('user').new() as user" >
        <button role="save" ng-click="user.save()">only changed button</button>
    </div>

What if you only want to exclude certain part? For instance, We can exlude the save button like:

	<div user-card-form gm-tpl-exclude="save" gm-data="D('user').new() as user" ></div>

#### 4. Import child element from a directive

Magic here, We can break the fence of html structure. Surpose we need to place the save button outside the `user-card-form` due to some insane reason, we simply do:

	<button gm-import="newUser" gm-role="save">save from outside</button>
	<div id="newUser" user-card-form gm-data="D('user').new() as user" ></div>

`gm-import` is used to specify the id of which element you want to import from, and  `gm-role` is used to identify the import part.

#### 5. Import directive's scope

In some cases interaction between directives requires a lot of api or event, and sharing scope would make it much easier. We cant still use `gm-import` to do that.

	<div gm-import="newUser" gm-tpl-inject>{{user.name}}</div>
	<div id="newUser" user-card-form gm-data="D('user').new() as user" ></div> 

### Conventions

#### 1. Expose api on element

Api should be exposed on element, no self definded type allowed.

#### 2. Use gm-src on the right element

We provided various ways like role-based element import for cases require scope or method sharing, please use it instead of lifting scope.

#### 3. Invoke callbacks and trigger event like build-in element

As title says, for example, implementing attribute `onSubmit` on a custom form would be the right way to invoke callback.

### Demo

This demo shows how to use a modal to wrapping a form.

**Directives**

```
.gmDirective( "myModal", function(){
    return {
      link : function( $scope, $el, $attrs ){
        $el.css({/*your modal css*/})

        $el[0].open = function(){
          $el.show()
        }

        $el[0].hide = function(){
          console.log("closing")
          $el.hide()
        }
        
        $el.hide()
      }
    }
  })
```

```
.gmDirective("userCardForm", function(){
    return {
      template:
      '<div role="input">'+
      '    <input type="text" ng-model="user.name">'+
      '    <input type="text" ng-model="user.gender">'+
      '</div>'+
      '<button role="save" ng-click="user.save()">save</button>',
      link : function( $scope, $el, $attrs){
          $scope.user.watch("$$saved", function( saved ){
			saved && $el.attr('onSubmit') ) && (new Function( $el.attr('onSubmit')))()
          })
      }
    }
  })
```

**HTML**

	<button onClick="el('ecs-create-modal').open()">open modal</button>

    <my-modal id="ecs-create-modal">
    
    	<modal-body>
	        <div id="userCard" gm-source="D('user').new() as user" gm-tpl-exclude="save" onSubmit="el('ecs-create-modal').hide()"></div>
    	</modal-body>
    	
    	<modal-foot>
        <button gm-import="userCard" gm-role="save">save</button>
	    </modal-foot>
	    
    </my-modal>