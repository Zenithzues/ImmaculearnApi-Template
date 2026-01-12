
export default function maskEmail(email) {
    if (!email) return null;
    const [name, domain] = email.split("@");
    if (name.length <= 2) return "*".repeat(name.length) + "@" + domain;
    const visible = name.slice(0, 4); // first 4 characters
    return visible + "****@" + domain;
}
