export function validateRegistration({email,password,confirm,nickname}) {
 if(password!==confirm)throw new Error('비밀번호가 일치하지 않습니다.');
 if(typeof password!=='string'||password.length<8)throw new Error('비밀번호는 8자 이상 입력해 주세요.');
 if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw new Error('이메일 형식을 확인해 주세요.');
 const name=String(nickname||'').normalize('NFC').trim();
 if(!/^[\p{L}\p{N} _-]{2,16}$/u.test(name))throw new Error('닉네임은 2~16자로 입력해 주세요.');
 return {email:email.trim(),password,nickname:name};
}
export function validatePassword(password,confirm){
 if(password!==confirm)throw new Error('비밀번호가 일치하지 않습니다.');
 if(typeof password!=='string'||password.length<8)throw new Error('비밀번호는 8자 이상 입력해 주세요.');
 return password;
}
