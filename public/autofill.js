// MakeMyTrip & myPartner Auto-Fill Bookmarklet
(function () {
    const jsonString = prompt("Paste your extracted Passport JSON data here:");
    if (!jsonString) return;

    let data;
    try {
        const cleanedString = jsonString.replace(/```json|```/g, '').trim();
        data = JSON.parse(cleanedString);
    } catch (e) {
        alert("Error: Invalid JSON format.");
        return;
    }

    function fillField(el, val) {
        if (!el) return;
        try {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
            el.classList.remove('error-bordered-input');
        } catch (e) {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function fillTravellerData(D, targetIdx = null) {
        const forms = document.querySelectorAll('.paxDetails');
        if (forms.length === 0) {
            alert("⚠️ No traveller forms found (.paxDetails).");
            return;
        }

        // Determine which form to fill
        let idx = targetIdx;
        if (idx === null) {
            // Find first empty form or ask
            const emptyForms = Array.from(forms).map((f, i) => {
                const input = f.querySelector('input[name*="FIRST_NAME"]');
                return { idx: i, empty: !input || !input.value };
            }).filter(f => f.empty);

            if (emptyForms.length > 0) {
                idx = emptyForms[0].idx;
            } else {
                idx = parseInt(prompt(`All ${forms.length} forms seem filled. Which index to overwrite? (1 to ${forms.length})`, "1")) - 1;
            }
        }

        if (isNaN(idx) || idx < 0 || idx >= forms.length) return;

        const f = forms[idx];
        console.log(`Filling Traveller ${idx + 1}`, f);

        const fn = f.querySelector(`input[name*="ADULT.${idx}.rowFields.FIRST_NAME"]`) || f.querySelector('input[placeholder*="First & Middle"]');
        if (fn && D.names) fillField(fn, D.names);

        const ln = f.querySelector(`input[name*="ADULT.${idx}.rowFields.LAST_NAME"]`) || f.querySelector('input[placeholder="Last Name"]');
        if (ln && (D.surname !== undefined)) fillField(ln, D.surname || "");

        if (D.sex) {
            const v = D.sex.toUpperCase().startsWith('F') ? 'FEMALE' : 'MALE';
            // 1. Find the input specifically by value within this traveller's form
            const inputs = Array.from(f.querySelectorAll('input[type="radio"]'));
            const r = inputs.find(i => i.value === v && (i.name.includes(`ADULT.${idx}`) || i.name.includes('GENDER')));

            if (r) {
                console.log(`Selecting gender ${v} for index ${idx}`);
                // 2. Find the label. If it has an ID, we use it, but we MUST escape colons or use [for="id"]
                // The most reliable way is to find the label that contains this specific input
                const label = f.querySelector(`label[for="${r.id}"]`) || r.closest('label') || r.parentElement;

                if (label) {
                    label.click();
                    // Some platforms need a double tap or specific sequence
                    setTimeout(() => {
                        r.checked = true;
                        r.dispatchEvent(new Event('change', { bubbles: true }));
                        r.dispatchEvent(new Event('click', { bubbles: true }));
                    }, 50);
                } else {
                    r.checked = true;
                    r.click();
                    r.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }

        alert(`✅ Filled Adult ${idx + 1} successfully!`);
    }

    const host = window.location.hostname;
    if (host.includes("makemytrip.com") || host.includes("localhost")) {
        fillTravellerData(data);
    } else {
        alert("⚠️ Run this on MakeMyTrip or myPartner portal.");
    }
})();


