// Player model for animations/tranforms
var player : GameObject;
var dustblast : ParticleEmitter;
var dustcloud : ParticleEmitter;
var dashbuild : ParticleEmitter;
var dashflash : ParticleEmitter;
var floorcrack : Projector;
private var playerPos : String = "left";
private var playerNum : int;
// Debug speedo for speed
private var speedo : float;
private var speedFall : float;
// Speed set
private var speed : float;
var initialSpeed : float = 2;
var jumpHeight : float = 7;
var dashDistance : float = 5;
private var dashPoint : Vector3;
private var horiz : float;
var onFloor : boolean = true;
var onWall : boolean = false;
var onCrouch : boolean = false;
var onDash : boolean = false;
private var canStand : boolean = true;
var canMove : boolean = true;
var facingWall : boolean = false;
private var wallDelay : float = 0.2;
private var timerDetach : float = wallDelay;
private var timerSlide : float = wallDelay*2;

//Sound Control
var sndHithard : AudioClip;
var sndDash : AudioClip;
var sndDashBuild : AudioClip;

private var keyAppendix : String;
private var interact : boolean = false;
private var levelcontrol : Control_Level;
private var colliderheight : float;



function Start (){
	// If you need to connect to the LevelControl, use this.
	levelcontrol=GameObject.Find("LevelControl").GetComponent(Control_Level);
	// Check if the Player has a rigidbody attached to it
	// Add one if not and freeze rotations
	if(!rigidbody){
		gameObject.AddComponent(Rigidbody);
		rigidbody.freezeRotation=true;
	}
	// Check if another player exists, if so assign appropriate player number and appendix
	if(GameObject.FindWithTag("Player")!=null && GameObject.FindWithTag("Player").GetComponent(Control_Character).playerNum==1){
		playerNum=2;
		keyAppendix="_2";
	}
	else{
		playerNum=1;
	}
	
	//Animation Control//
	player.animation["jump"].layer=1;
	player.animation["skid"].layer=1;
	player.animation.Stop();
	
	// Store initial collider height for crouch
	colliderheight=collider.height;
}

function FixedUpdate(){
	AnimatePlayer();
	RaycastDown();
	RayCastSides();
	CrouchControl();
}
function Update(){
	if(canMove){
		DetectKeys();
		UpdatePlayer();
	}
	DetectDash();
}

function DetectKeys(){
	// HORIZONTAL MOVEMENT //
	horiz = Input.GetAxis("Horizontal"+keyAppendix);
	if(!onWall){
		// Add speed relative to direction and set speed
		rigidbody.AddForce(Vector3(8*horiz*speed,0,0));
		// Check max speed and reduce accordingly
		if(speedo>(4+speed)){
			rigidbody.AddForce(Vector3(-10*speed,0,0));
		}
		else if(speedo<-(4+speed)){
			rigidbody.AddForce(Vector3(10*speed,0,0));
		}
	}
	// INTERACTION BUTTON //
	if(Input.GetButtonDown("Interact"+keyAppendix)){
		interact=true;
	}
	else{
		interact=false;
	}
	// JUMP BUTTON //
	if(Input.GetButtonDown("Jump"+keyAppendix)){
		// If on floor
		if(onFloor){
			rigidbody.velocity.y = jumpHeight;
		}
		// If on wall
		else if(onWall){
			var jumpdir : float;
			rigidbody.drag=0;
			if(facingWall){
				// set appropriate direction to jump based on side the wall is
				if(playerPos=="right"){
					jumpdir=-1;
				}
				else{
					jumpdir=1;
				}
			} else{
				jumpdir=horiz;
			}
			rigidbody.AddForce(Vector3(jumpdir*jumpHeight*30,0,0));
			rigidbody.velocity.y = jumpHeight;
		}
		player.animation.CrossFade("jump");
	}
	// CROUCH BUTTON //
	if(Input.GetButton("Crouch"+keyAppendix)){
		if(onFloor){
			onCrouch=true;
			speed=initialSpeed/2;
		}
	}
	else{
		if(canStand){
			onCrouch=false;
			speed=initialSpeed;
		}
	}
}

function DetectDash(){
	// DASH BUTTON //
	if(Input.GetButton("Dash"+keyAppendix)){
		// one-shot executes
		if(!onDash){
			onDash=true;
			canMove=false;
			// stop any horizontal animation that might be playing
			horiz=0;
			AudioSource.PlayClipAtPoint(sndDashBuild, transform.position);
			rigidbody.drag=20;
		}
		// timer for keeping in air
		WallDrag();
		if(dashbuild.particleCount<10){
			Instantiate(dashbuild,transform.position,transform.rotation);
		}
		var dashVert : float = Input.GetAxis("Vertical"+keyAppendix);
		var dashHoriz: float = Input.GetAxis("Horizontal"+keyAppendix);
		var hitDash : RaycastHit;
		var dirDash = Vector3(dashHoriz,dashVert,0);
		Debug.DrawRay(transform.position,dirDash*dashDistance,Color.yellow);
		// If Raycast hits something
		if (Physics.Raycast (transform.position,dirDash,hitDash,dashDistance)){
			Debug.DrawLine (transform.position,hitDash.point);
			// set point of dash to collision point
			dashPoint=hitDash.point;
		}
		else{
			// set point of dash to end of ray
			dashPoint=transform.position+dirDash*dashDistance;
		}
	}
	else{
		// execute when dash is released
		if(onDash){
			Instantiate(dashflash,(transform.position+dashPoint)/2,transform.rotation);
			// transport player
			transform.position=dashPoint;
			if(onFloor){
				// if on the floor, add force for skid and play skid animation
				if(playerPos=="right"){
					rigidbody.AddForce(Vector3(200,0,0));
				} else{
					rigidbody.AddForce(Vector3(-200,0,0));
				}
				player.animation.CrossFade("skid");
			}
			AudioSource.PlayClipAtPoint(sndDash, dashPoint);
			iTween.ShakeRotation(Camera.main.gameObject,{"amount":Vector3(0,2,0),"time":0.2});
			onDash=false;
			canMove=true;
		}
	}
}

function CrouchControl(){
	if(onCrouch){
		// Smooth transition of collider height shrinking
		if(collider.height>colliderheight/2){
			collider.height-=0.03;
		}
		// Align player model with new collider height
		if(player.transform.localPosition.y<-colliderheight/4){
			player.transform.localPosition.y+=0.015;
		}
		var hitTop : RaycastHit;
		var distTop = collider.height+0.2;
		Debug.DrawRay(transform.position,Vector3.up*distTop,Color.blue);
		// If raycast hits something
		if (Physics.Raycast (transform.position,Vector3.up,hitTop,distTop)){
			Debug.DrawLine (transform.position,hitTop.point);
			// and that something is a 'ceiling' trigger (need to make this work without the trigger)
			if(hitTop.collider.gameObject.tag == "Ceiling"){
				// player cannot stand up yet
				canStand=false;
			}
		}
		else{
			canStand=true;
		}
	}
	else{
		collider.height=colliderheight;
		player.transform.localPosition.y=-colliderheight/2;
	}
}

function AnimatePlayer(){
	speedo = rigidbody.velocity.x;
	if(onFloor){
		// If playing the 'landing_hard' animation, wait for it to finish, then player can move
		if(player.animation["landing_hard"].enabled){
			if(player.animation["landing_hard"].time>player.animation["landing_hard"].length){
				player.animation.Stop();
				canMove=true;
			}
		} else if(horiz==0){
			if(onCrouch){
				player.animation.CrossFade("crouch_idle");
			} else{
				player.animation.CrossFade("idle");
			}
		} else{
			if(onCrouch){
				player.animation.CrossFade("crouch_walk");
			} else{
				player.animation.CrossFade("run");
			}
		}
	} else if(onWall){
		if(facingWall){
			player.animation.Play("grabwall_facing");
		} else{
			player.animation.Play("grabwall_away");
		}
	} else{
		player.animation.CrossFade("falling");
	}
}

function UpdatePlayer(){
	// Set player direction
	if(horiz>0){
		playerPos="right";
		transform.LookAt(Vector3(transform.position.x+1,0,0));
	}
	else if(horiz<0){
		playerPos="left";
		transform.LookAt(Vector3(transform.position.x-1,0,0));
	}
	// Lock Axis'
	transform.position.z=0;
	transform.rotation.z=0;
	transform.rotation.x=0;
	player.transform.localRotation=Quaternion(0,0,0,0);
	player.transform.localPosition.z=0;
}

function RaycastDown(){
	// FLOOR CHECKING //
	speedFall = rigidbody.velocity.y;
	var hitFloor : RaycastHit;
	var distDown = collider.height/2+0.2;
	Debug.DrawRay(transform.position,Vector3.down*distDown,Color.green);
    if (Physics.Raycast (transform.position,Vector3.down,hitFloor,distDown)) {
		// If ray hits 'floor'
		if(hitFloor.collider.gameObject.tag == "Floor"){
			Debug.DrawLine (transform.position,hitFloor.point);
			// If not on the floor already
			if(!onFloor){
				// Checking for high impact
				if(speedFall<-18){
					canMove=false;
					player.animation.CrossFade("landing_hard");
					iTween.ShakeRotation(Camera.main.gameObject,{"amount":Vector3(speedFall/10,0,0),"time":1});
					Instantiate(dustcloud,hitFloor.point,Quaternion.FromToRotation(Vector3.up, hitFloor.normal));
					AudioSource.PlayClipAtPoint(sndHithard, hitFloor.point);
					DecalGenerate(floorcrack,hitFloor.point,hitFloor.normal);
				} else{
					// Normal hit floor
					player.animation.Stop();
				}
			Instantiate(dustblast,hitFloor.point,Quaternion.FromToRotation(Vector3.up, hitFloor.normal));
			onFloor=true;
			}
		}
    } else{
		onFloor=false;
		if(speedFall<-5){
			// Fall code
		}
	}
}

function DecalGenerate(decal : Projector, decalPosition : Vector3, decalNormal : Vector3){
	// DECAL PLACEMENT - for example, floor cracks on high impact //
	var decalPlace : GameObject = Instantiate(decal.gameObject);
	// place slightly above position
	decalPlace.transform.position=decalPosition+decalNormal*0.01;
	// Turn it to look at position (to project)
	decalPlace.transform.LookAt(decalPosition);
}

function RayCastSides(){
	// HORIZONTAL CHECKING //
	var hitLeft : RaycastHit;
	var hitRight : RaycastHit;
	var distWall = collider.radius;
	var posRay = Vector3(transform.position.x,transform.position.y-0.5,transform.position.z);
	Debug.DrawRay(posRay, Vector3.left*distWall, Color.red);
	Debug.DrawRay(posRay, Vector3.right*distWall, Color.red);
	// LEFT CHECK
	if (Physics.Raycast (posRay,Vector3.left,hitLeft,distWall)) {
		if(hitLeft.collider.gameObject.tag == "Wall"){
			Debug.DrawLine (posRay, hitLeft.point);
			// if not on the wall, or the floor
			if(!onWall && !onFloor){
				player.animation.Stop();
				Instantiate(dustblast,hitLeft.point,Quaternion.FromToRotation(Vector3.up, hitLeft.normal));
				onWall=true;
				rigidbody.drag=20;
			}
			// timer for rigidbody.drag to wear off
			WallDrag();
			// function for checking if facing wall
			WallCheck(false);
		}
    }
	// RIGHT CHECK
	else if (Physics.Raycast (posRay,Vector3.right,hitRight,distWall)) {
		if(hitRight.collider.gameObject.tag == "Wall"){
			Debug.DrawLine (posRay, hitRight.point);
			if(!onWall && !onFloor){
				player.animation.Stop();
				Instantiate(dustblast,hitRight.point,Quaternion.FromToRotation(Vector3.up, hitRight.normal));
				onWall=true;
				rigidbody.drag=20;
			}
			WallDrag();
			WallCheck(true);
		}
    }
	else{
		onWall=false;
		// Bodged code for allowing use of rigidbody.drag with dash
		if(!onDash){
			rigidbody.drag=0;
			timerSlide=wallDelay*2;
		}
		timerDetach=wallDelay;
	}
}

function WallCheck(onLeft : boolean){
	//Check if character is facing wall
	if(horiz<0){
		facingWall=!onLeft;
	}
	else if(horiz>0){
		facingWall=onLeft;
	}

	// If not, start detach timer
	if(!facingWall){
		if(timerDetach>0){
			timerDetach-=Time.deltaTime;
		}
		else if(timerDetach<=0){
			onWall=false;
		}
	}
}

function WallDrag(){
	// Timer for reseting drag to 0
	if(timerSlide>0){
		timerSlide-=Time.deltaTime;
	}
	else if(timerSlide<=0){
		rigidbody.drag = 0;
	}
}