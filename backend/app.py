# app.py - Flask Application (PostgreSQL & Render Ready)
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid
import jwt
from functools import wraps
import os

app = Flask(__name__)

# Configuration for PostgreSQL
DATABASE_URL = os.environ.get('DATABASE_URL')

# Fix for Render's PostgreSQL URL format
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'postgresql://localhost/smail_dev'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)

# CORS configuration - Update with your frontend URL
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "https://nova-mail.onrender.com/",  # Local development
            "https://*.onrender.com",  # Render frontend
            os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        ]
    }
})

# Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    sent_emails = db.relationship('Email', foreign_keys='Email.from_user_id', backref='sender', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name
        }


class Email(db.Model):
    __tablename__ = 'emails'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    from_email = db.Column(db.String(255), nullable=False, index=True)
    to_email = db.Column(db.String(255), nullable=False, index=True)
    subject = db.Column(db.String(500), nullable=False)
    body = db.Column(db.Text)
    date = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    starred = db.Column(db.Boolean, default=False)
    read = db.Column(db.Boolean, default=False)
    folder = db.Column(db.String(50), default='inbox', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'from': self.from_email,
            'to': self.to_email,
            'subject': self.subject,
            'body': self.body,
            'date': self.date.isoformat(),
            'starred': self.starred,
            'read': self.read,
            'folder': self.folder
        }


class Attachment(db.Model):
    __tablename__ = 'attachments'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email_id = db.Column(db.String(36), db.ForeignKey('emails.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    file_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    email = db.relationship('Email', backref='attachments')


# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


# Routes

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'database': 'connected' if db.engine else 'disconnected'})


# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', email.split('@')[0] if email else '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Optional: Enforce @smail.com domain
    # if not email.endswith('@smail.com'):
    #     return jsonify({'error': 'Email must be @smail.com domain'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(email=email, name=name)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    token = jwt.encode(
        {'user_id': user.id},
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = jwt.encode(
        {'user_id': user.id},
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    })


# Email routes
@app.route('/api/emails', methods=['GET'])
@token_required
def get_emails(current_user):
    folder = request.args.get('folder')
    search = request.args.get('search')
    
    query = Email.query.filter(
        db.or_(
            Email.from_email == current_user.email,
            Email.to_email == current_user.email
        )
    )
    
    if folder:
        query = query.filter_by(folder=folder)
    
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            db.or_(
                Email.subject.ilike(search_term),
                Email.body.ilike(search_term),
                Email.from_email.ilike(search_term)
            )
        )
    
    emails = query.order_by(Email.date.desc()).all()
    
    return jsonify([email.to_dict() for email in emails])


@app.route('/api/emails/<email_id>', methods=['GET'])
@token_required
def get_email(current_user, email_id):
    email = Email.query.get(email_id)
    
    if not email:
        return jsonify({'error': 'Email not found'}), 404
    
    if email.from_email != current_user.email and email.to_email != current_user.email:
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify(email.to_dict())


@app.route('/api/emails', methods=['POST'])
@token_required
def send_email(current_user):
    data = request.get_json()
    
    to = data.get('to')
    subject = data.get('subject')
    body = data.get('body', '')
    
    if not to or not subject:
        return jsonify({'error': 'To and subject are required'}), 400
    
    # Create sent email
    sent_email = Email(
        from_user_id=current_user.id,
        from_email=current_user.email,
        to_email=to,
        subject=subject,
        body=body,
        folder='sent',
        read=True
    )
    
    db.session.add(sent_email)
    
    # If recipient exists in system, create inbox email
    recipient = User.query.filter_by(email=to).first()
    if recipient:
        inbox_email = Email(
            from_user_id=current_user.id,
            from_email=current_user.email,
            to_email=to,
            subject=subject,
            body=body,
            folder='inbox',
            read=False
        )
        db.session.add(inbox_email)
    
    db.session.commit()
    
    return jsonify(sent_email.to_dict()), 201


@app.route('/api/emails/<email_id>', methods=['PATCH'])
@token_required
def update_email(current_user, email_id):
    email = Email.query.get(email_id)
    
    if not email:
        return jsonify({'error': 'Email not found'}), 404
    
    if email.from_email != current_user.email and email.to_email != current_user.email:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'read' in data:
        email.read = data['read']
    if 'starred' in data:
        email.starred = data['starred']
    if 'folder' in data:
        email.folder = data['folder']
    
    db.session.commit()
    
    return jsonify(email.to_dict())


@app.route('/api/emails/<email_id>', methods=['DELETE'])
@token_required
def delete_email(current_user, email_id):
    email = Email.query.get(email_id)
    
    if not email:
        return jsonify({'error': 'Email not found'}), 404
    
    if email.from_email != current_user.email and email.to_email != current_user.email:
        return jsonify({'error': 'Access denied'}), 403
    
    if email.folder == 'trash':
        db.session.delete(email)
        db.session.commit()
        return jsonify({'message': 'Email permanently deleted'})
    else:
        email.folder = 'trash'
        db.session.commit()
        return jsonify(email.to_dict())


@app.route('/api/folders/counts', methods=['GET'])
@token_required
def get_folder_counts(current_user):
    user_emails = Email.query.filter(
        db.or_(
            Email.from_email == current_user.email,
            Email.to_email == current_user.email
        )
    )
    
    counts = {
        'inbox': user_emails.filter_by(folder='inbox').count(),
        'unread': user_emails.filter_by(folder='inbox', read=False).count(),
        'sent': user_emails.filter_by(folder='sent').count(),
        'archive': user_emails.filter_by(folder='archive').count(),
        'trash': user_emails.filter_by(folder='trash').count()
    }
    
    return jsonify(counts)


# Database initialization
with app.app_context():
    db.create_all()


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5001)))
